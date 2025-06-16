import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { ScheduleEntryType } from '../types/models';
import Installer from '../models/installerModel';
import Schedule from '../models/scheduleModel';
import mongoose from 'mongoose';
import Service from '../models/serviceModel';
import Store from '../models/storeModel';

const createSchedule = expressAsyncHandler(
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
      installerId: number;
      type: ScheduleEntryType;
      serviceId: string;
      description: string;
    } = req.body;

    if (!startTime || !endTime || !installerId || !type) {
      res.status(400);
      throw new Error('Faltan datos para crear el calendario');
    }
    const installerExists = await Installer.findOne({
      installerId,
      deleted: false,
    });

    if (!installerExists) {
      res.status(400);
      throw new Error('No existe el instalador');
    }

    const hasConflict = await Schedule.findOne({
      installerId,
      $and: [
        { startTime: { $lt: new Date(endTime) } },
        { endTime: { $gt: new Date(startTime) } },
      ],
    });

    if (hasConflict) {
      res.status(400);
      throw new Error(
        'El horario del instalador choca con otro horario establecido',
      );
    }

    const newSchedule = await Schedule.create({
      startTime,
      endTime,
      type,
      installerId,
      ...(serviceId && { serviceId }),
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
      id,
      startTime,
      endTime,
      installerId,
      type,
      serviceId,
      description,
    }: {
      id: string;
      startTime: Date;
      endTime: Date;
      installerId: number;
      type: ScheduleEntryType;
      serviceId: string;
      description: string;
    } = req.body;

    const schedule = await Schedule.findById(id);

    if (!schedule) {
      res.status(400);
      throw new Error('No se encontró el horario');
    }

    if (installerId) {
      const installerExists = await Installer.findOne({
        installerId,
        deleted: false,
      });

      if (!installerExists) {
        res.status(400);
        throw new Error('No existe el instalador');
      }

      schedule.installerId = installerId;
    }

    if (startTime || endTime) {
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

    schedule.type = type || schedule.type;

    if (serviceId) {
      const service = await Service.findOne({ _id: serviceId, deleted: false });

      if (!service) {
        res.status(400);
        throw new Error('No se encontró el servicio');
      }

      schedule.serviceId = new mongoose.Types.ObjectId(serviceId);
    }

    if (description) schedule.description = description;
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
      if (admin.role == 'local') {
        const schedules = await Schedule.aggregate([
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
              'service.storeId': new mongoose.Types.ObjectId(admin.storeId),
            },
          },
        ]);

        res.status(200).json({
          error: false,
          message: 'Horarios encontrados',
          schedules,
        });
      } else if (admin.role == 'district') {
        const stores = await Store.find({ district: admin.district }).select(
          '_id',
        );

        const storesIds = stores.map(
          (store) => new mongoose.Types.ObjectId(store._id),
        );

        const schedules = await Schedule.aggregate([
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
              'service.storeId': { $in: storesIds },
            },
          },
        ]);

        res.status(200).json({
          error: false,
          message: 'Horarios encontrados',
          schedules,
        });
      } else {
        const stores = await Store.find({ country: admin.country }).select(
          '_id',
        );

        const storesIds = stores.map(
          (store) => new mongoose.Types.ObjectId(store._id),
        );

        const schedules = await Schedule.aggregate([
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
              'service.storeId': { $in: storesIds },
            },
          },
        ]);

        res.status(200).json({
          error: false,
          message: 'Tiendas encontradas',
          schedules,
        });
      }
    } else {
      if (!installer?.installerId) {
        res.status(400);
        throw new Error('Falta el id del instalador');
      }
      const schedules = await Schedule.find({
        installerId: installer.installerId,
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
