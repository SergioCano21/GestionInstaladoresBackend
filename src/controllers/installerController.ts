import expressAsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { compare, genSalt, hash } from 'bcryptjs';
import Installer from '../models/installerModel';
import { IStore } from '../types/models';
import Store from '../models/storeModel';
import jwt from 'jsonwebtoken';

const login = expressAsyncHandler(async (req: Request, res: Response) => {
  const { installerId, password }: { installerId: number; password: string } =
    req.body;

  if (!installerId || !password) {
    res.status(400);
    throw new Error('Faltan datos por ingresar');
  }

  const installer = await Installer.findOne({ installerId, deleted: false });

  if (!installer) {
    res.status(400);
    throw new Error('No se encontró al instalador');
  }

  const samePassword = await compare(password, installer.password);

  if (!samePassword) {
    res.status(400);
    throw new Error('Constraseña incorrecta');
  }

  const newToken = jwt.sign(
    { isAdmin: false, id: installer._id },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
  res
    .status(200)
    .cookie('access_token', newToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 1000 * 60 * 60,
    })
    .json({
      message: 'Login realizado con éxito',
      error: false,
      token: newToken,
    });
});

const createInstaller = expressAsyncHandler(
  async (req: Request, res: Response) => {
    let { installerId, name, company, password, email, phone } = req.body;

    const storeId = req.admin?.storeId;

    // Temporal fix
    password = '123456';
    //

    if (!name || !company || !installerId || !email) {
      res.status(400);
      throw new Error('Falta ingresar datos del instalador');
    }

    if (!storeId) {
      res.status(400);
      throw new Error(
        'Error al obtener la tienda a la que se está registrando el instalador',
      );
    }

    const installerExists = await Installer.findOne({ installerId });
    if (installerExists) {
      res.status(400);
      throw new Error('Ya existe un instalador registrado con ese id');
    }

    const salt: string = await genSalt(10);
    const hashedPassword: string = await hash(password, salt);

    const newInstaller = await Installer.create({
      installerId,
      storeId,
      name,
      email,
      ...(phone && { phone }),
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
        ...(newInstaller.phone && { phone: newInstaller.phone }),
        company: newInstaller.company,
      },
    });
  },
);

const addExistingInstaller = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { installerId } = req.body;
    const storeId = req.admin?.storeId;

    const updatedInstaller = await Installer.findOneAndUpdate(
      { installerId },
      { $addToSet: { storeId: storeId } },
      { new: true },
    );
    if (!updatedInstaller) {
      res.status(400);
      throw new Error('Instalador no encontrado');
    }
    res.status(200).json({
      message: 'Se agrego al instalador correctamente',
      installer: {
        id: updatedInstaller._id,
        installerId: updatedInstaller.installerId,
        name: updatedInstaller.name,
        email: updatedInstaller.email,
        phone: updatedInstaller.phone,
        company: updatedInstaller.company,
      },
      error: false,
    });
  },
);

const updateInstaller = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { installerId, storeId, name, email, phone, company, password } =
      req.body;
    const { id } = req.params;

    const installer = await Installer.findOne({ _id: id, deleted: false });
    if (!installer) {
      res.status(400);
      throw new Error('No se encontró al instalador');
    }

    if (installerId && installerId !== installer.installerId) {
      const idInUse = await Installer.findOne({ installerId });
      if (idInUse && idInUse._id.toString() != installer._id.toString()) {
        res.status(400);
        throw new Error('Ya existe un instalador con ese id');
      }
      installer.installerId = installerId;
    }

    if (email && email !== installer.email) {
      const emailInUse = await Installer.findOne({ email });
      if (emailInUse && emailInUse._id.toString() != installer._id.toString()) {
        res.status(400);
        throw new Error('Ya existe un instalador con ese email');
      }
      installer.email = email;
    }

    installer.storeId = storeId || installer.storeId;
    if (name && name !== installer.name) installer.name = name;
    if (company && company !== installer.company) installer.company = company;
    if (phone && phone !== installer.phone) installer.phone = phone;

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
        ...(installer.phone && { phone: installer.phone }),
        company: installer.company,
      },
      message: 'Instalador actualizado correctamente',
    });
  },
);

const deleteInstaller = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const storeId = req.admin?.storeId;

    const updatedInstaller = await Installer.findOneAndUpdate(
      { _id: id },
      { $pull: { storeId: storeId } },
      { new: true },
    );
    if (!updatedInstaller) {
      res.status(400);
      throw new Error('Instalador no encontrado');
    }
    res.status(200).json({
      message: 'Se eliminó de la tienda al instalador correctamente',
      installer: {
        id: updatedInstaller._id,
        installerId: updatedInstaller.installerId,
        name: updatedInstaller.name,
        email: updatedInstaller.email,
        phone: updatedInstaller.phone,
        company: updatedInstaller.company,
      },
      error: false,
    });
  },
);

const findInstallers = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      res.status(403);
      throw new Error('Acceso no autorizado');
    }

    let storeQuery: Partial<IStore> = { deleted: false };

    switch (admin.role) {
      case 'national':
        storeQuery.country = admin.country ?? '';
        break;
      case 'district':
        storeQuery.district = admin.district ?? '';
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

    const stores = await Store.find(storeQuery).lean();
    const storesIds = stores.map((store) => store._id.toString());
    const installers = await Installer.find({
      storeId: { $in: storesIds },
    })
      .populate({ path: 'storeId', select: '_id numStore name' })
      .select('-password -createdAt -updatedAt -__v')
      .lean();

    res.status(200).json({
      error: false,
      installers,
      message: 'Instaladores encontrados',
    });
  },
);

export {
  createInstaller,
  updateInstaller,
  deleteInstaller,
  findInstallers,
  login,
  addExistingInstaller,
};
