import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Receipt from '../models/recepitModel';
import Service from '../models/serviceModel';
import { generatePDF } from '../services/pdfService';
import path from 'path';
import fs from 'fs/promises';
import { deletePdf, uploadPdf } from '../services/pdfUpload';
import sendEmail from '../services/emailService';
import { ReceiptData } from '../types/models';
import Schedule from '../models/scheduleModel';

const createReceipt = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const data: ReceiptData = JSON.parse(req.body.data);

    const {
      startTime,
      endTime,
      installerName,
      installedProduct,
      recommendations,
      clientComments,
      clientSignature,
      isClientAbsent,
      relationshipWithClient,
      secondaryClientName,
      serviceId,
      clientEmail,
    } = data;

    const files = req.files as Express.Multer.File[];
    const images = await Promise.all(
      files.map(async (file) => {
        const fileData = await fs.readFile(file.path);
        const base64 = `data:${file.mimetype};base64,${fileData.toString('base64')}`;

        await fs.unlink(file.path).catch((err) => {
          if (err)
            console.error(
              'Error al eliminar archivo temporal:',
              file.path,
              err,
            );
        });

        return base64;
      }),
    );

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

    if (images.length < 3 || images.length > 6) {
      res.status(400);
      throw new Error('Se deben enviar entre 3 y 6 imagenes de evidencia');
    }

    const service = await Service.findById(serviceId).populate([
      { path: 'storeId', select: 'name numStore phone -_id' },
      { path: 'installerId', select: 'installerId name -_id' },
    ]);

    if (!service) {
      res.status(400);
      throw new Error('No se encontró el servicio');
    }

    const receiptExist = await Receipt.findOne({ serviceId: service._id });
    if (receiptExist) {
      service.status = 'Done';
      service.save();

      res.status(409).json({
        code: 'RECEIPT_ALREADY_EXISTS',
        message: 'Ya hay un recibo creado para este servicio.',
        error: true,
        completed: true,
      });
      return;
    }

    console.log('Terminan validaciones');

    let pdfPath: string | null = null;
    let uploadResult: { url: string; publicId: string } | null = null;
    let receipt: any = null;

    try {
      // Generation of the pdf receipt file
      const logoPath = `${path.join(__dirname, '..', 'templates', 'assets', 'logo.svg')}`;
      const logoSvg = await fs.readFile(logoPath, 'utf-8');
      const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

      const css = await fs.readFile(
        path.join(__dirname, '..', 'templates', 'styles', 'styles.css'),
        'utf-8',
      );

      const receiptData = {
        title: `Folio - ${service.folio}`,
        styles: `<style>${css}</style>`,
        logoPath: logoBase64,
        serviceId: service._id,
        folio: service.folio,
        endTime: endTime.split('T')[0],
        nameStore: (service.storeId as any).name,
        numStore: (service.storeId as any).numStore,
        phoneStore: (service.storeId as any).phone,
        clientName: service.client,
        clientPhone: service.clientPhone,
        clientAddress: service.address,
        installerTitular: (service.installerId as any).name,
        installerId: (service.installerId as any).installerId,
        installerName: installerName,
        startTime: startTime.split('T')[0],
        installedProduct: installedProduct[0].installedProduct,
        installedIn: installedProduct[0].installedIn,
        quantity: installedProduct[0].quantity,
        specification: installedProduct[0].specification,
        serialNumber: installedProduct[0].serialNumber,
        recommendations: recommendations,
        clientComments: clientComments,
        images: images,
        ...(!isClientAbsent && { signature: clientSignature }),
        ...(isClientAbsent && { secondaryClientName: secondaryClientName }),
        ...(isClientAbsent && {
          relationshipWithClient: relationshipWithClient,
        }),
        ...(isClientAbsent && { secondarySignature: clientSignature }),
      };

      pdfPath = await generatePDF(
        path.join(__dirname, '..', 'templates', 'receipt.hbs'),
        receiptData,
      );

      console.log('PDF generado');

      // Guardar PDF
      uploadResult = await uploadPdf(pdfPath);

      console.log('Subido a cloudinary');

      // Agregar url del PDF con serviceId a la base de datos
      receipt = await Receipt.create({
        serviceId: service._id,
        receiptUrl: uploadResult.url,
        publicId: uploadResult.publicId,
      });

      console.log('Creado en la db');

      service.status = 'Done';
      service.save();

      // Enviar correo al cliente con PDF
      await sendEmail(
        clientEmail,
        'Recibo de Servicio de Instalación',
        pdfPath,
        `${service._id}.pdf`,
        isClientAbsent ? secondaryClientName! : service.client,
      );

      console.log('Correo enviado');

      // Borrar horario del servicio
      await Schedule.findOneAndDelete({ serviceId: service._id });

      res.status(200).json({
        error: false,
        message: 'Recibo de Conformidad creado',
        receipt,
      });
    } catch (error: any) {
      if (receipt)
        await Receipt.findByIdAndDelete(receipt._id).catch((err) =>
          console.log('Failed to delete receipt document from db: ', err),
        );

      if (uploadResult) await deletePdf(uploadResult.publicId);

      throw error;
    } finally {
      if (pdfPath)
        await fs.unlink(pdfPath).catch(() => {
          console.log('Error trying to delete pdf file from:', pdfPath);
        });
    }
  },
);

const findReceipt = expressAsyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;

  const receipt = await Receipt.findOne({ serviceId }).lean();
  if (!receipt) {
    res.status(400);
    throw new Error('No se encontró el recibo');
  }

  res.status(200).json({
    error: false,
    message: 'Recibo encontrado',
    receiptUrl: receipt.receiptUrl,
  });
});

export { createReceipt, findReceipt };
