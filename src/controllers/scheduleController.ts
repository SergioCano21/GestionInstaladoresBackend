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
      date?: string;
      startTime: string;
      endTime: string;
      type: ScheduleEntryType;
      serviceId?: string;
      description?: string;
    } = req.body;

    const req_installer = req.installer?._id;

    if (!startTime || !endTime || !type) {
      res.status(400);
      throw new Error('Faltan datos para agendar el horario');
    }

    const startDateTime = date
      ? new Date(`${date}T${startTime}`)
      : new Date(startTime);
    const endDateTime = date
      ? new Date(`${date}T${endTime}`)
      : new Date(endTime);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      res.status(400);
      throw new Error('Formato de fecha u hora inválido');
    }
    if (startDateTime >= endDateTime) {
      res.status(400);
      throw new Error('La hora de inicio debe ser anterior a la hora de fin');
    }

    let installerId: string | null = null;

    if (type === 'Service') {
      if (!serviceId) {
        res.status(400);
        throw new Error(
          'Se requiere el id del servicio para un horario de tipo Service',
        );
      }

      const service = await Service.findById(serviceId).select('installerId');

      if (!service) {
        res.status(404);
        throw new Error('Servicio no encontrado');
      }

      installerId = service.installerId.toString();
    } else if (type === 'Block') {
      if (!req_installer) {
        res.status(400);
        throw new Error('Error al obtener id de instalador');
      }
      installerId = req_installer.toString();
    }

    const conflictQuery: any = {
      startTime: { $lt: endDateTime },
      endTime: { $gt: startDateTime },
    };

    if (type === 'Service') {
      conflictQuery.serviceId = { $ne: serviceId };
    }
    if (type === 'Block') {
      conflictQuery.installerId = { $eq: installerId };
    }

    const conflict = await Schedule.findOne(conflictQuery).populate({
      path: 'serviceId',
      match: installerId ? { installerId } : {},
    });

    if (conflict) {
      res.status(400);
      throw new Error(
        type === 'Block'
          ? 'El horario de bloqueo choca con otro horario'
          : 'El instalador ya tiene un horario en ese rango',
      );
    }

    const newSchedule = await Schedule.create({
      startTime: startDateTime,
      endTime: endDateTime,
      type,
      ...(serviceId && { serviceId }),
      ...(installerId && { installerId }),
      ...(description && { description }),
    });

    res.status(201).json({
      error: false,
      message: 'Horario creado correctamente',
      schedule: newSchedule,
    });
  },
);

/*
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
      throw new Error('Faltan datos para agendar el horario');
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
*/

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
        'service.status': { $ne: 'Canceled' },
      };
    }

    let projectStage: any = {};
    if (admin) {
      projectStage = {
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
      };
    }
    if (installer) {
      projectStage = {
        _id: 1,
        startTime: 1,
        endTime: 1,
        serviceId: '$service._id',
        folio: '$service.folio',
        address: '$service.address',
        type: 1,
        status: '$service.status',
        description: 1,
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
        $project: projectStage,
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
