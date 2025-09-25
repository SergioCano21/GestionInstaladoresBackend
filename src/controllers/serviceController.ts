import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Service from '../models/serviceModel';
import { IFeeBreakdown, IJobDetails, Status } from '../types/models';
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
  const { status } = req.params;
  const admin = req.admin;
  const installer = req.installer;

  if (!status || (status !== 'active' && status !== 'completed')) {
    res.status(400);
    throw new Error('Error al pasar el status como parametro');
  }

  const statusMap = {
    active: ['To Do', 'Doing'],
    completed: ['Done', 'Canceled'],
  };

  let projectStage: any = {
    _id: 1,
    folio: 1,
    client: 1,
    status: 1,
    description: 1,
    clientPhone: 1,
    address: 1,
    additionalComments: 1,
    store: {
      numStore: '$store.numStore',
      name: '$store.name',
    },
    schedule: {
      startTime: '$schedule.startTime',
      endTime: '$schedule.endTime',
    },
  };

  if (admin) {
    projectStage = {
      ...projectStage,
      jobDetails: 1,
      subtotals: 1,
      iva: 1,
      totals: 1,
      installerId: '$installer._id',
      installer: {
        installerId: '$installer.installerId',
        name: '$installer.name',
      },
    };
  }
  if (installer) {
    projectStage = {
      ...projectStage,
      store: {
        ...projectStage.store,
        phone: '$store.phone',
      },
      totals: {
        installerPayment: '$totals.installerPayment',
      },
      jobDetails: {
        $map: {
          input: '$jobDetails',
          as: 'detail',
          in: {
            quantity: '$$detail.quantity',
            description: '$$detail.description',
          },
        },
      },
    };
  }

  const services = await Service.aggregate([
    // First filter based on active or completed services
    {
      $match: {
        deleted: false,
        status: { $in: statusMap[status] },
      },
    },

    // Bring Installer data
    {
      $lookup: {
        from: 'installers',
        localField: 'installerId',
        foreignField: '_id',
        as: 'installer',
      },
    },
    { $unwind: '$installer' },

    // Bring Store data
    {
      $lookup: {
        from: 'stores',
        localField: 'storeId',
        foreignField: '_id',
        as: 'store',
      },
    },
    { $unwind: '$store' },

    // Second filter based on role
    ...(admin?.role === 'district'
      ? [{ $match: { 'store.district': admin.district } }]
      : admin?.role === 'national'
        ? [{ $match: { 'store.country': admin.country } }]
        : admin?.role === 'local'
          ? [{ $match: { storeId: admin.storeId } }]
          : installer
            ? [{ $match: { installerId: installer._id } }]
            : []),

    // Bring Schedule data
    {
      $lookup: {
        from: 'schedules',
        localField: '_id',
        foreignField: 'serviceId',
        as: 'schedule',
      },
    },
    { $unwind: { path: '$schedule', preserveNullAndEmptyArrays: true } },

    // Retrieve only necessary data
    { $project: projectStage },
  ]);

  res.status(200).json({
    error: false,
    message: 'Servicios encontrados',
    services,
  });
});

const updateService = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const {
      folio,
      client,
      clientPhone,
      address,
      jobDetails,
      additionalComments,
      installerId,
      status,
    }: {
      folio: number;
      client: string;
      clientPhone: string;
      address: string;
      jobDetails: IJobDetails[];
      additionalComments: string | null;
      installerId: string;
      status: Status;
    } = req.body;

    const { id } = req.params;

    const service = await Service.findOne({ _id: id, deleted: false });

    if (!service) {
      res.status(400);
      throw new Error('No se encontró el servicio');
    }

    if (folio && folio !== service.folio) {
      const folioInUse = await Service.findOne({ folio });
      if (folioInUse && folioInUse._id.toString() != service._id.toString()) {
        res.status(400);
        throw new Error('Ya existe un servicio con ese folio');
      }
      service.folio = folio;
    }

    if (client && client !== service.client) service.client = client;
    if (clientPhone && clientPhone !== service.clientPhone)
      service.clientPhone = clientPhone;
    if (address && address !== service.address) service.address = address;
    if (additionalComments && additionalComments !== service.additionalComments)
      service.additionalComments = additionalComments;

    if (installerId && installerId !== service.installerId.toString()) {
      service.installerId = new mongoose.Types.ObjectId(installerId);
    }

    if (status && status !== service.status) service.status = status;

    if (jobDetails && jobDetails !== service.jobDetails) {
      let installationServiceFee: number = 0;
      let commissionFee: number = 0;
      let installerPayment: number = 0;

      jobDetails.forEach((jobDetail: IJobDetails) => {
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

      service.jobDetails = jobDetails;
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
    const { id } = req.params;

    const deletedService = await Service.findOneAndUpdate(
      { _id: id },
      { status: 'Canceled' },
      { new: true },
    );

    if (!deletedService || deletedService.status !== 'Canceled') {
      res.status(400);
      throw new Error('Error al intentar eliminar el servicio');
    }

    res.status(200).json({
      error: false,
      message: 'Servicio eliminado correctamente',
      service: deletedService,
    });
  },
);

const restoreService = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const restoredService = await Service.findOneAndUpdate(
      { _id: id },
      { status: 'To Do' },
      { new: true },
    );

    if (!restoredService || restoredService.status !== 'To Do') {
      res.status(400);
      throw new Error('Error al intentar restaurar el servicio');
    }

    res.status(200).json({
      error: false,
      message: 'Servicio restaurado correctamente',
      service: restoredService,
    });
  },
);

export {
  createService,
  findService,
  updateService,
  deleteService,
  restoreService,
};
