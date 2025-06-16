import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { IInstalledProduct } from '../types/models';
import Receipt from '../models/recepitModel';
import Service from '../models/serviceModel';
import mongoose from 'mongoose';
import Store from '../models/storeModel';

const createReceipt = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const {
      startTime,
      endTime,
      installerName,
      installedProduct,
      recommendations,
      clientComments,
      images,
      clientSignature,
      isClientAbsent,
      relationshipWithClient,
      secondaryClientName,
      serviceId,
    }: {
      startTime: Date;
      endTime: Date;
      installerName: string;
      installedProduct: IInstalledProduct[];
      recommendations: string;
      clientComments: string;
      images: string[];
      clientSignature: string;
      isClientAbsent: boolean;
      relationshipWithClient: string;
      secondaryClientName: string;
      serviceId: string;
    } = req.body;

    if (
      !startTime ||
      !endTime ||
      !installerName ||
      !installedProduct ||
      !images ||
      !clientSignature ||
      !recommendations ||
      !clientComments ||
      !serviceId
    ) {
      res.status(400);
      throw new Error('Faltan datos para generar el Recibo de Conformidad');
    }

    if (
      (isClientAbsent && !relationshipWithClient) ||
      (isClientAbsent && !secondaryClientName)
    ) {
      res.status(400);
      throw new Error('Faltan datos de quien firma en caso de ausencia');
    }

    if (images.length < 3) {
      res.status(400);
      throw new Error('Se deben enviar mínimo 3 imagenes de evidencia');
    }

    const serviceExists = await Service.findById(serviceId);

    if (!serviceExists) {
      res.status(400);
      throw new Error('No se encontró el servicio');
    }

    const receipt = await Receipt.create({
      startTime,
      endTime,
      installerName,
      installedProduct,
      recommendations,
      clientComments,
      images,
      clientSignature,
      isClientAbsent,
      ...(isClientAbsent && { relationshipWithClient }),
      ...(isClientAbsent && { secondaryClientName }),
      serviceId,
    });

    serviceExists.status = 'Done';
    serviceExists.save();

    res.status(200).json({
      error: false,
      message: 'Recibo de Conformidad creado',
      receipt,
    });
  },
);

const findReceipt = expressAsyncHandler(async (req: Request, res: Response) => {
  const { installerId }: { installerId: number } = req.body;

  const admin = req.admin;

  if (admin) {
    if (admin.role == 'local') {
      const receipt = await Receipt.aggregate([
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
        message: 'Recibos de Conformidad encontrados',
        receipt,
      });
    } else if (admin.role == 'district') {
      const stores = await Store.find({ district: admin.district }).select(
        '_id',
      );

      const storesIds = stores.map(
        (store) => new mongoose.Types.ObjectId(store._id),
      );

      const receipt = await Receipt.aggregate([
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
        message: 'Recibos de Conformidad encontrados',
        receipt,
      });
    } else {
      const stores = await Store.find({ country: admin.country }).select('_id');

      const storesIds = stores.map(
        (store) => new mongoose.Types.ObjectId(store._id),
      );

      const receipt = await Receipt.aggregate([
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
        message: 'Recibos de Conformidad encontrados',
        receipt,
      });
    }
  } else {
    if (!installerId) {
      res.status(400);
      throw new Error('Falta el id del instalador');
    }

    const receipt = await Receipt.aggregate([
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
          'service.installerId': installerId,
        },
      },
    ]);

    res.status(200).json({
      error: false,
      message: 'Recibos de Conformidad encontrados',
      receipt,
    });
  }
});

export { createReceipt, findReceipt };
