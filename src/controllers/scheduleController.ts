import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { ScheduleEntryType } from '../types/models';
import Installer from '../models/installerModel';
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

    const service = await Service.findById(serviceId).select('installerId');
    if (!service) {
      res.status(400);
      throw new Error('No se encontró el servicio');
    }
    if (!service.installerId) {
      res.status(400);
      throw new Error('El servicio no tiene un instalador asignado');
    }

    const installerId = service.installerId;
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

    const hasConflict = await Schedule.findOne({
      installerId,
      $and: [
        { startTime: { $lt: endDateTime } },
        { endTime: { $gt: startDateTime } },
      ],
    });

    if (hasConflict) {
      res.status(400);
      throw new Error(
        'El horario del instalador choca con otro horario establecido',
      );
    }

    const newSchedule = await Schedule.create({
      startTime: startDateTime,
      endTime: endDateTime,
      type,
      installerId,
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
      startTime,
      endTime,
      installerId,
      type,
      serviceId,
      description,
    }: {
      startTime: Date;
      endTime: Date;
      installerId: string;
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

    if (installerId && installerId !== schedule.installerId.toString()) {
      const installerExists = await Installer.findOne({
        installerId,
      });

      if (!installerExists) {
        res.status(400);
        throw new Error('No existe el instalador');
      }

      schedule.installerId = new mongoose.Types.ObjectId(installerId);
    }

    if (
      (startTime && startTime !== schedule.startTime) ||
      (endTime && endTime !== schedule.endTime)
    ) {
      schedule.startTime = startTime || schedule.startTime;
      schedule.endTime = endTime || schedule.endTime;

      const hasConflict = await Schedule.findOne({
        installerId: schedule.installerId,
        $and: [
          { startTime: { $lt: new Date(schedule.endTime) } },
          { endTime: { $gt: new Date(schedule.startTime) } },
        ],
      });

      if (hasConflict) {
        res.status(400);
        throw new Error(
          'El horario del instalador choca con otro horario establecido',
        );
      }
    }

    if (serviceId && serviceId !== schedule.serviceId.toString()) {
      const service = await Service.findOne({ _id: serviceId, deleted: false });

      if (!service) {
        res.status(400);
        throw new Error('No se encontró el servicio');
      }

      schedule.serviceId = new mongoose.Types.ObjectId(serviceId);
    }

    if (type && type !== schedule.type) schedule.type = type;
    if (description && description !== schedule.description)
      schedule.description = description;
  },
);

const deleteSchedule = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id }: { id: string } = req.body;

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

    if (admin) {
      let matchCondition: any = {};
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
            localField: 'installerId',
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
            service: {
              _id: '$service._id',
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
    } else {
      if (!installer?.installerId) {
        res.status(400);
        throw new Error('Falta el id del instalador');
      }
      const schedules = await Schedule.find({
        installerId: installer._id,
      }).populate('serviceId');
      res.status(200).json({
        error: false,
        message: 'Horarios encontrados',
        schedules,
      });
    }
  },
);

export { createSchedule, updateSchedule, deleteSchedule, findSchedule };
