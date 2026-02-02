import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { ScheduleEntryType } from '../types/models';
import Schedule from '../models/scheduleModel';
import mongoose from 'mongoose';
import Service from '../models/serviceModel';
import { SCHEDULE_OPTIONS } from '../constants/schedule';
import { STATUS_OPTIONS } from '../constants/service';
import { ROLE_OPTIONS } from '../constants/admin';

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

    let installer: mongoose.Types.ObjectId | null = null;

    if (type === SCHEDULE_OPTIONS.SERVICE) {
      if (!startTime || !endTime || !serviceId) {
        res.status(400);
        throw new Error('Faltan datos para agendar el horario');
      }

      const exist = await Schedule.findOne({ serviceId }).lean();

      if (exist) {
        res.status(400);
        throw new Error('El servicio ya tiene un horario asignado');
      }

      const service = await Service.findById(serviceId)
        .select('installerId')
        .lean();

      if (!service) {
        res.status(404);
        throw new Error('Servicio no encontrado');
      }

      installer = service.installerId;
    } else if (type === SCHEDULE_OPTIONS.BLOCK) {
      if (!startTime || !endTime) {
        res.status(400);
        throw new Error('Faltan datos para apartar el horario');
      }

      installer = req.installer?._id!;
    } else {
      res.status(400);
      throw new Error('Error en el tipo de horario');
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

    const conflict = await Schedule.aggregate([
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      {
        $match: {
          $or: [
            { installerId: installer },
            { 'service.installerId': installer },
          ],
          startTime: { $lt: endDateTime },
          endTime: { $gt: startDateTime },
        },
      },
    ]);

    if (conflict.length > 0) {
      res.status(400);
      throw new Error('El horario choca con otro horario establecido');
    }

    const newSchedule = await Schedule.create({
      startTime: startDateTime,
      endTime: endDateTime,
      type,
      ...(type === SCHEDULE_OPTIONS.SERVICE && { serviceId }),
      ...(type === SCHEDULE_OPTIONS.BLOCK && { installerId: installer }),
      ...(type === SCHEDULE_OPTIONS.BLOCK && description && { description }),
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

    const schedule = await Schedule.findById(id).populate({
      path: 'serviceId',
      select: 'installerId',
    });

    if (!schedule) {
      res.status(400);
      throw new Error('No se encontró el horario');
    }

    let installer: mongoose.Types.ObjectId;

    if (type === SCHEDULE_OPTIONS.SERVICE)
      installer = (schedule.serviceId as any).installerId;
    else if (type === SCHEDULE_OPTIONS.BLOCK) installer = schedule.installerId;
    else {
      res.status(400);
      throw new Error('Error en el tipo de horario');
    }

    const startDateTime = date
      ? new Date(`${date}T${startTime}`)
      : new Date(startTime);
    const endDateTime = date
      ? new Date(`${date}T${endTime}`)
      : new Date(endTime);

    if (
      startDateTime !== schedule.startTime ||
      endDateTime !== schedule.endTime
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
    }

    if (serviceId && serviceId !== schedule.serviceId.toString()) {
      const serviceExist = await Service.findById(serviceId)
        .select('_id')
        .lean();

      if (!serviceExist) {
        res.status(400);
        throw new Error('No se encontró el servicio');
      }

      schedule.serviceId = serviceExist._id;
    }

    if (description !== undefined && description !== schedule.description)
      schedule.description = description;

    if (type === SCHEDULE_OPTIONS.SERVICE) {
      const duplicateSchedule = await Schedule.findOne({
        serviceId: schedule.serviceId,
        _id: { $ne: schedule._id },
      });

      if (duplicateSchedule) {
        res.status(400);
        throw new Error('Ya existe un horario para este servicio');
      }
    }

    const conflict = await Schedule.aggregate([
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      {
        $match: {
          $or: [
            { installerId: installer },
            { 'service.installerId': installer },
          ],
          startTime: { $lt: schedule.endTime },
          endTime: { $gt: schedule.startTime },
          _id: { $ne: schedule._id },
        },
      },
    ]);

    if (conflict.length > 0) {
      res.status(400);
      throw new Error('El horario choca con otro horario establecido');
    }

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

    let matchCondition: any = {
      'service.status': {
        $nin: [STATUS_OPTIONS.CANCELED, STATUS_OPTIONS.DONE],
      },
    };
    if (admin) {
      switch (admin.role) {
        case ROLE_OPTIONS.LOCAL:
          if (!admin.storeId) {
            res.status(400);
            throw new Error(
              'Error al buscar calendario, no hay tienda del administrador',
            );
          }
          matchCondition = {
            ...matchCondition,
            'installer.storeId': admin.storeId,
          };

          break;
        case ROLE_OPTIONS.DISTRICT:
          if (!admin.district) {
            res.status(400);
            throw new Error(
              'Error al buscar calendario, no se encontró el distrito del administrador',
            );
          }
          matchCondition = {
            ...matchCondition,
            'store.district': admin.district,
          };

          break;
        case ROLE_OPTIONS.NATIONAL:
          if (!admin.country) {
            res.status(400);
            throw new Error(
              'Error al buscar calendario, no se encontró el país del administrador',
            );
          }
          matchCondition = {
            ...matchCondition,
            'store.country': admin.country,
          };

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
        ...matchCondition,
        'installer._id': installer._id,
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
        description: 1,
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
        $unwind: {
          path: '$service',
          preserveNullAndEmptyArrays: true,
        },
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
        $unwind: {
          path: '$store',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'installers',
          localField: 'service.installerId',
          foreignField: '_id',
          as: 'installerFromService',
        },
      },
      {
        $lookup: {
          from: 'installers',
          localField: 'installerId',
          foreignField: '_id',
          as: 'installerFromBlock',
        },
      },
      {
        $addFields: {
          installer: {
            $cond: {
              if: { $gt: [{ $size: '$installerFromService' }, 0] },
              then: { $arrayElemAt: ['$installerFromService', 0] },
              else: { $arrayElemAt: ['$installerFromBlock', 0] },
            },
          },
        },
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
