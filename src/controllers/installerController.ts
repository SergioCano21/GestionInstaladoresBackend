import expressAsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { compare, genSalt, hash } from 'bcryptjs';
import Installer from '../models/installerModel';
import { IStore } from '../types/models';
import Store from '../models/storeModel';
import Admin from '../models/adminModel';
import jwt from 'jsonwebtoken';

const login = expressAsyncHandler(async (req: Request, res: Response) => {
  const { installerId, password }: { installerId: number; password: string } =
    req.body;

  if (!installerId || !password) {
    res.status(400);
    throw new Error('Faltan datos por ingresar');
  }

  const installer = await Installer.findOne({ installerId });

  if (installer && (await compare(password, installer.password))) {
    const newToken = jwt.sign(
      { isAdmin: false, id: installer._id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    res
      .status(200)
      .json({
        message: 'Login realizado con éxito',
        error: false,
        token: newToken,
      })
      .cookie('access_token', newToken, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 1000 * 60 * 60,
      });
  }
});

const createInstaller = expressAsyncHandler(
  async (req: Request, res: Response) => {
    let { installerId, name, company, password, email, phone, storeId } =
      req.body;
    if (!name || !company || !password || !installerId) {
      res.status(400);
      throw new Error('Falta ingresar datos del instalador');
    }

    if (!storeId) {
      res.status(400);
      throw new Error(
        'Falta agregar tienda a la que se está registrando el instalador',
      );
    }

    const installerExists = await Installer.findOne({ installerId });
    if (installerExists) {
      res.status(400);
      throw new Error('Ya existe un instalador registrado con ese id');
    }

    const salt: string = await genSalt(10);
    const hashedPassword: string = await hash(password, salt);

    if (!email) email = '';
    if (!phone) phone = '';

    const newInstaller = await Installer.create({
      installerId,
      storeId,
      name,
      email,
      phone,
      company,
      password: hashedPassword,
    });

    res.status(201).json({
      message: 'Instalador registrado exitosamente',
      error: false,
      installer: {
        id: newInstaller._id,
        installerId: newInstaller.installerId,
        storeId: newInstaller.storeId,
        name: newInstaller.name,
        email: newInstaller.email,
        phone: newInstaller.phone,
        company: newInstaller.company,
      },
    });
  },
);

const updateInstaller = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id, installerId, storeId, name, email, phone, company, password } =
      req.body;
    const installer = await Installer.findOne({ _id: id, deleted: false });
    if (!installer) {
      res.status(400);
      throw new Error('No se encontró al instalador');
    }
    installer.installerId = installerId || installer.installerId;
    installer.storeId = storeId || installer.storeId;
    installer.name = name || installer.name;
    installer.email = email || installer.email;
    installer.phone = phone || installer.phone;
    installer.company = company || installer.company;

    if (password) {
      const salt: string = await genSalt(10);
      const hashedPassword: string = await hash(password, salt);
      installer.password = hashedPassword;
    }

    await installer.save();

    res.status(200).json({
      error: false,
      installer: {
        id: installer._id,
        installerId: installer.installerId,
        storeId: installer.storeId,
        name: installer.name,
        email: installer.email,
        phone: installer.phone,
        company: installer.company,
      },
      message: 'Instalador actualizado correctamente',
    });
  },
);

const deleteInstaller = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id }: { id: string } = req.body;
    const deletedInstaller = await Installer.findOneAndUpdate(
      { _id: id },
      { deleted: true },
      { new: true },
    );
    if (!deletedInstaller || !deletedInstaller.deleted) {
      res.status(400);
      throw new Error('Error al intentar borrar al instalador');
    }
    res.status(200).json({
      message: 'Instalador borrado correctamente',
      installer: {
        id: deletedInstaller._id,
        installerId: deletedInstaller.installerId,
        name: deletedInstaller.name,
        email: deletedInstaller.email,
        phone: deletedInstaller.phone,
        company: deletedInstaller.company,
      },
      error: false,
    });
  },
);

const findInstallers = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id }: { id: string } = req.body;
    const admin = await Admin.findById(id);
    if (!admin) {
      res.status(403);
      throw new Error('Acceso no autorizado');
    }

    let storeQuery: Partial<IStore> = { deleted: false };

    switch (admin.role) {
      case 'national':
        storeQuery.country = admin.country;
        break;
      case 'state':
        storeQuery.state = admin.state;
        break;
      case 'city':
        storeQuery.city = admin.city;
        break;
      case 'local':
        if (!admin.storeId) {
          res.status(400);
          throw new Error('No se encontró tienda para este administrador');
        }
        storeQuery = { _id: admin.storeId, deleted: false };
        break;
      default:
        res.status(400);
        throw new Error('Rol inválido');
    }

    const stores = await Store.find(storeQuery);
    const storesIds = stores.map((store) => store._id);

    const installers = await Installer.find({
      storeId: { $in: storesIds },
      deleted: false,
    });

    res.status(200).json({
      error: false,
      installers,
    });
  },
);

export {
  createInstaller,
  updateInstaller,
  deleteInstaller,
  findInstallers,
  login,
};
