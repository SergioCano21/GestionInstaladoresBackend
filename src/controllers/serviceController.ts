import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Service from '../models/serviceModel';
import { IFeeBreakdown, IJobDetails, Status } from '../types/models';
import Store from '../models/storeModel';
import mongoose from 'mongoose';

const createService = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const {
      folio,
      client,
      clientPhone,
      address,
      jobDetails,
      additionalComments,
      installerId,
    }: {
      folio: number;
      client: string;
      clientPhone: string;
      address: string;
      jobDetails: IJobDetails[];
      additionalComments: string | null;
      installerId: string;
    } = req.body;

    const adminId = req.admin?._id;
    const storeId = req.admin?.storeId;

    if (
      !folio ||
      !client ||
      !clientPhone ||
      !address ||
      !jobDetails ||
      !installerId
    ) {
      res.status(400);
      throw new Error('Faltan datos para crear el servicio');
    }

    const serviceExist = await Service.findOne({ folio });

    if (serviceExist) {
      res.status(400);
      throw new Error('Ya existe un servicio registrado con ese folio');
    }

    let installationServiceFee: number = 0;
    let commissionFee: number = 0;
    let installerPayment: number = 0;

    jobDetails.forEach((jobDetail) => {
      jobDetail.commissionFee =
        Math.floor(jobDetail.installationServiceFee * 0.2 * 100) / 100;
      jobDetail.installerPayment =
        jobDetail.installationServiceFee - jobDetail.commissionFee;

      installationServiceFee += jobDetail.installationServiceFee;
      commissionFee += jobDetail.commissionFee;
      installerPayment += jobDetail.installerPayment;
    });

    const subtotals: IFeeBreakdown = {
      installationServiceFee,
      commissionFee,
      installerPayment,
    };

    const iva: IFeeBreakdown = {
      installationServiceFee: Number(
        (subtotals.installationServiceFee * 0.16).toFixed(2),
      ),
      commissionFee: Number((subtotals.commissionFee * 0.16).toFixed(2)),
      installerPayment: Number((subtotals.installerPayment * 0.16).toFixed(2)),
    };

    const totals: IFeeBreakdown = {
      installationServiceFee:
        subtotals.installationServiceFee + iva.installationServiceFee,
      commissionFee: subtotals.commissionFee + iva.commissionFee,
      installerPayment: subtotals.installerPayment + iva.installerPayment,
    };

    const status: Status = 'To Do';

    const newService = await Service.create({
      folio,
      client,
      clientPhone,
      address,
      jobDetails,
      subtotals,
      iva,
      totals,
      ...(additionalComments && { additionalComments }),
      adminId,
      installerId,
      storeId,
      status,
    });

    res.status(201).json({
      error: false,
      message: 'Servicio creado correctamente',
      service: newService,
    });
  },
);

const findService = expressAsyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  const installer = req.installer;

  if (admin) {
    if (admin.role == 'local') {
      const services = await Service.find({
        storeId: admin.storeId,
        deleted: false,
      })
        .select('-_id -deleted -adminId -deleted -updatedAt -createdAt -__v')
        .populate([
          { path: 'installerId', select: 'installerId name' },
          { path: 'storeId', select: 'numStore name' },
        ]);
      res.status(200).json({
        error: false,
        message: 'Servicios encontrados',
        services,
      });
    } else if (admin.role == 'district') {
      const stores = await Store.find({ district: admin.district }).select(
        '_id',
      );
      const storesIds = stores.map((store) => store._id);
      const services = await Service.find({
        storeId: { $in: storesIds },
        deleted: false,
      })
        .select('-_id -deleted -adminId -deleted -updatedAt -createdAt -__v')
        .populate([
          { path: 'installerId', select: 'installerId name' },
          { path: 'storeId', select: 'numStore name' },
        ]);
      res.status(200).json({
        error: false,
        message: 'Servicios encontrados',
        services,
      });
    } else {
      const stores = await Store.find({ country: admin.country }).select('_id');
      const storesIds = stores.map((store) => store._id);
      const services = await Service.find({
        storeId: { $in: storesIds },
        deleted: false,
      })
        .select('-_id -deleted -adminId -deleted -updatedAt -createdAt -__v')
        .populate([
          { path: 'installerId', select: 'installerId name' },
          { path: 'storeId', select: 'numStore name' },
        ]);
      res.status(200).json({
        error: false,
        message: 'Servicios encontrados',
        services,
      });
    }
  } else {
    if (!installer?.installerId) {
      res.status(400);
      throw new Error('Falta el id del instalador');
    }
    const services = await Service.find({ installerId: installer._id })
      .select('-_id -deleted -adminId -deleted -updatedAt -createdAt -__v')
      .populate([
        { path: 'installerId', select: 'installerId name' },
        { path: 'storeId', select: 'numStore name' },
      ]);
    res.status(200).json({
      error: false,
      message: 'Servicios encontrados',
      services,
    });
  }
});

const updateService = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const {
      id,
      folio,
      client,
      clientPhone,
      address,
      jobDetails,
      additionalComments,
      installerId,
    }: {
      id: string;
      folio: number;
      client: string;
      clientPhone: string;
      address: string;
      jobDetails: IJobDetails[];
      additionalComments: string | null;
      installerId: string;
    } = req.body;

    const service = await Service.findOne({ _id: id, deleted: false });

    if (!service) {
      res.status(400);
      throw new Error('No se encontró el servicio');
    }

    if (folio) {
      const folioInUse = await Service.findOne({ folio });
      if (folioInUse && folioInUse._id.toString() != service._id.toString()) {
        res.status(400);
        throw new Error('Ya existe un servicio con ese folio');
      }
      service.folio = folio;
    }

    service.client = client || service.client;
    service.clientPhone = clientPhone || service.clientPhone;
    service.address = address || service.address;
    service.additionalComments =
      additionalComments || service.additionalComments;

    if (installerId) {
      service.installerId = new mongoose.Types.ObjectId(installerId);
    }

    if (jobDetails) {
      let installationServiceFee: number = 0;
      let commissionFee: number = 0;
      let installerPayment: number = 0;

      jobDetails.forEach((jobDetail) => {
        jobDetail.commissionFee =
          Math.floor(jobDetail.installationServiceFee * 0.2 * 100) / 100;
        jobDetail.installerPayment =
          jobDetail.installationServiceFee - jobDetail.commissionFee;

        installationServiceFee += jobDetail.installationServiceFee;
        commissionFee += jobDetail.commissionFee;
        installerPayment += jobDetail.installerPayment;
      });

      const subtotals: IFeeBreakdown = {
        installationServiceFee,
        commissionFee,
        installerPayment,
      };

      const iva: IFeeBreakdown = {
        installationServiceFee: Number(
          (subtotals.installationServiceFee * 0.16).toFixed(2),
        ),
        commissionFee: Number((subtotals.commissionFee * 0.16).toFixed(2)),
        installerPayment: Number(
          (subtotals.installerPayment * 0.16).toFixed(2),
        ),
      };

      const totals: IFeeBreakdown = {
        installationServiceFee:
          subtotals.installationServiceFee + iva.installationServiceFee,
        commissionFee: subtotals.commissionFee + iva.commissionFee,
        installerPayment: subtotals.installerPayment + iva.installerPayment,
      };

      service.jobDetails = jobDetails || service.jobDetails;
      service.subtotals = subtotals;
      service.iva = iva;
      service.totals = totals;
    }

    await service.save();

    res.status(200).json({
      error: false,
      message: 'Servicio actualizado correctamente',
      service,
    });
  },
);

const deleteService = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id }: { id: string } = req.body;

    const deletedService = await Service.findOneAndUpdate(
      { _id: id },
      { deleted: true },
      { new: true },
    );

    if (!deletedService || !deletedService.deleted) {
      res.status(400);
      throw new Error('Error al intentar borrar al instalador');
    }

    res.status(200).json({
      error: false,
      message: 'Servicio borrado correctamente',
      service: deletedService,
    });
  },
);

export { createService, findService, updateService, deleteService };
