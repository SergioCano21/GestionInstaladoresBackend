import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { ScheduleEntryType } from '../types/models';
import Schedule from '../models/scheduleModel';
import mongoose from 'mongoose';
import Service from '../models/serviceModel';

const createSchedule = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const {
      date,
      startTime,
      endTime,
      type,
      serviceId,
      description,
    }: {
      date: string;
      startTime: string;
      endTime: string;
      type: ScheduleEntryType;
      serviceId: string;
      description: string;
    } = req.body;

    if (!date || !startTime || !endTime || !serviceId || !type) {
      res.status(400);
      throw new Error('Faltan datos para crear el calendario');
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      res.status(400);
      throw new Error('Formato de fecha u hora inválido');
    }

    if (startDateTime >= endDateTime) {
      res.status(400);
      throw new Error('La hora de inicio debe ser anterior a la hora de fin');
    }

    const result = await Service.aggregate([
      // Find specific service by ID
      { $match: { _id: new mongoose.Types.ObjectId(serviceId) } },

      // Verify if there are conflicts with the schedule
      {
        $lookup: {
          from: 'schedules',
          let: { installerId: '$installerId', serviceId: '$_id' },
          pipeline: [
            {
              $lookup: {
                from: 'services',
                localField: 'serviceId',
                foreignField: '_id',
                as: 'service',
              },
            },
            { $unwind: '$service' },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$service.installerId', '$$installerId'] },
                    { $ne: ['$serviceId', '$$serviceId'] },
                  ],
                },
                startTime: { $lt: endDateTime },
                endTime: { $gt: startDateTime },
              },
            },
            { $limit: 1 }, // Only need one to check if there are conflicts
            { $project: { _id: 1 } },
          ],
          as: 'conflicts',
        },
      },

      // Project only necessary fields
      {
        $project: {
          installerId: 1,
          hasConflicts: { $gt: [{ $size: '$conflicts' }, 0] },
        },
      },
    ]);

    if (!result.length) {
      res.status(400);
      throw new Error('No se encontró el servicio');
    }

    if (result[0].hasConflicts) {
      res.status(400);
      throw new Error(
        'El horario del instalador choca con otro horario establecido',
      );
    }

    const newSchedule = await Schedule.create({
      startTime: startDateTime,
      endTime: endDateTime,
      type,
      serviceId,
      ...(description && { description }),
    });

    res.status(201).json({
      error: false,
      message: 'Horario creado correctamente',
      schedule: newSchedule,
    });
  },
);

const updateSchedule = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const {
      date,
      startTime,
      endTime,
      type,
      serviceId,
      description,
    }: {
      date: string;
      startTime: string;
      endTime: string;
      type: ScheduleEntryType;
      serviceId: string;
      description: string;
    } = req.body;
    const { id } = req.params;

    const schedule = await Schedule.findById(id);

    if (!schedule) {
      res.status(400);
      throw new Error('No se encontró el horario');
    }

    let serviceForConflictCheck = schedule.serviceId;

    if (serviceId && serviceId !== schedule.serviceId.toString()) {
      const serviceExist = await Service.findOne({
        _id: serviceId,
        deleted: false,
      });

      if (!serviceExist) {
        res.status(400);
        throw new Error('No se encontró el servicio');
      }
      schedule.serviceId = new mongoose.Types.ObjectId(serviceId);
      serviceForConflictCheck = new mongoose.Types.ObjectId(serviceId);
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (
      (startTime && startDateTime !== schedule.startTime) ||
      (endTime && endDateTime !== schedule.endTime)
    ) {
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        res.status(400);
        throw new Error('Formato de fecha u hora inválido');
      }

      if (startDateTime >= endDateTime) {
        res.status(400);
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }
      schedule.startTime = startDateTime;
      schedule.endTime = endDateTime;

      const currentService = await Service.findById(serviceForConflictCheck)
        .select('installerId')
        .lean();
      if (!currentService) {
        res.status(400);
        throw new Error('No se encontró el servicio');
      }

      const hasConflict = await Schedule.aggregate([
        {
          $lookup: {
            from: 'services',
            localField: 'serviceId',
            foreignField: '_id',
            as: 'service',
          },
        },
        { $unwind: '$service' },
        {
          $match: {
            'service.installerId': currentService.installerId,
            startTime: { $lt: new Date(schedule.endTime) },
            endTime: { $gt: new Date(schedule.startTime) },
            _id: { $ne: new mongoose.Types.ObjectId(id) },
          },
        },
        { $limit: 1 },
        { $project: { _id: 1 } },
      ]);

      if (hasConflict.length > 0) {
        res.status(400);
        throw new Error(
          'El horario del instalador choca con otro horario establecido',
        );
      }
    }

    if (type && type !== schedule.type) schedule.type = type;
    if (description && description !== schedule.description)
      schedule.description = description;

    await schedule.save();

    res.status(200).json({
      error: false,
      message: 'Horario actualizado correctamente',
      schedule,
    });
  },
);

const deleteSchedule = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const schedule = await Schedule.findByIdAndDelete(id);

    if (!schedule) {
      res.status(400);
      throw new Error('No se encontró el horario');
    }

    res.status(200).json({
      error: false,
      message: 'Horario borrado correctamente',
    });
  },
);

const findSchedule = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const admin = req.admin;
    const installer = req.installer;

    let matchCondition: any = {};
    if (admin) {
      switch (admin.role) {
        case 'local':
          if (!admin.storeId) {
            res.status(400);
            throw new Error(
              'Error al buscar calendario, no hay tienda del administrador',
            );
          }
          matchCondition = {
            'store._id': new mongoose.Types.ObjectId(admin.storeId),
          };
          break;
        case 'district':
          if (!admin.district) {
            res.status(400);
            throw new Error(
              'Error al buscar calendario, no se encontró el distrito del administrador',
            );
          }
          matchCondition = { 'store.district': admin.district };
          break;
        case 'national':
          if (!admin.country) {
            res.status(400);
            throw new Error(
              'Error al buscar calendario, no se encontró el país del administrador',
            );
          }
          matchCondition = { 'store.country': admin.country };
          break;
        default:
          res.status(400);
          throw new Error('Error al buscar calendario');
      }
    } else {
      if (!installer) {
        res.status(400);
        throw new Error('Falta el id del instalador');
      }
      matchCondition = {
        'installer._id': new mongoose.Types.ObjectId(installer._id),
      };
    }

    const schedules = await Schedule.aggregate([
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      {
        $unwind: '$service',
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'service.storeId',
          foreignField: '_id',
          as: 'store',
        },
      },
      {
        $unwind: '$store',
      },
      {
        $lookup: {
          from: 'installers',
          localField: 'service.installerId',
          foreignField: '_id',
          as: 'installer',
        },
      },
      {
        $unwind: '$installer',
      },
      {
        $match: matchCondition,
      },
      {
        $project: {
          _id: 1,
          startTime: 1,
          endTime: 1,
          type: 1,
          serviceId: 1,
          service: {
            folio: '$service.folio',
            status: '$service.status',
            client: '$service.client',
          },
          installer: {
            _id: '$installer._id',
            name: '$installer.name',
          },
          store: {
            _id: '$store._id',
            name: '$store.name',
            numStore: '$store.numStore',
          },
        },
      },
    ]);

    res.status(200).json({
      error: false,
      message: 'Horarios encontrados',
      schedules,
    });
  },
);

export { createSchedule, updateSchedule, deleteSchedule, findSchedule };
