import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Admin from '../models/adminModel';
import { genSalt, hash } from 'bcryptjs';
import { IAdmin } from '../types/models';

const createAdmin = expressAsyncHandler(async (req: Request, res: Response) => {
  let { username, password, name, email, storeId, role, city, state, country } =
    req.body;
  if (!username || !password || !name || !email || !role) {
    res.status(400);
    throw new Error('Falta ingresar datos del administrador');
  }

  if (role == 'local' && !storeId) {
    res.status(400);
    throw new Error(
      'Falta agregar tienda a la que se está registrando el administrador',
    );
  }

  const adminExists = await Admin.findOne({ username });

  if (adminExists) {
    res.status(400);
    throw new Error('Ya existe un administrador con ese usuario');
  }

  const salt: string = await genSalt(10);
  const hashedPassword: string = await hash(password, salt);

  if (!email) email = '';

  const newAdmin = await Admin.create({
    username,
    password: hashedPassword,
    name,
    email,
    role,
    ...(storeId && { storeId }),
    ...(city && { city }),
    ...(state && { state }),
    ...(country && { country }),
  });

  res.status(201).json({
    message: 'Administrador registrado exitosamente',
    error: false,
    admin: {
      id: newAdmin._id,
      username: newAdmin.username,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      ...(newAdmin.storeId && { storeId: newAdmin.storeId }),
      ...(newAdmin.city && { city: newAdmin.city }),
      ...(newAdmin.state && { state: newAdmin.state }),
      ...(newAdmin.country && { country: newAdmin.country }),
    },
  });
});

const deleteAdmin = expressAsyncHandler(async (req: Request, res: Response) => {
  const { id }: { id: string } = req.body;
  const deletedAdmin = await Admin.findOneAndUpdate(
    { _id: id },
    { deleted: true },
    { new: true },
  );
  if (!deletedAdmin || !deletedAdmin.deleted) {
    res.status(400);
    throw new Error('Error al intentar borrar al administrador');
  }
  res.status(200).json({
    message: 'Administrador borrado correctamente',
    admin: {
      id: deletedAdmin._id,
      username: deletedAdmin.username,
      name: deletedAdmin.name,
      email: deletedAdmin.email,
    },
    error: false,
  });
});

const updateAdmin = expressAsyncHandler(async (req: Request, res: Response) => {
  const {
    id,
    name,
    email,
    username,
    password,
    storeId,
    role,
    city,
    state,
    country,
  } = req.body;
  const admin = await Admin.findOne({ _id: id, deleted: false });
  if (!admin) {
    res.status(400);
    throw new Error('No se encontró al administrador');
  }
  admin.name = name || admin.name;
  admin.email = email || admin.email;
  admin.username = username || admin.username;
  admin.role = role || admin.role;
  if (storeId != null) admin.storeId = storeId;
  if (city != null) admin.city = city;
  if (state != null) admin.state = state;
  if (country != null) admin.country = country;

  if (password) {
    const salt: string = await genSalt(10);
    const hashedPassword: string = await hash(password, salt);
    admin.password = hashedPassword;
  }

  await admin.save();

  res.status(200).json({
    error: false,
    installer: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      ...(admin.storeId && { storeId: admin.storeId }),
      ...(admin.city && { city: admin.city }),
      ...(admin.state && { state: admin.state }),
      ...(admin.country && { country: admin.country }),
    },
    message: 'Administrador actualizado correctamente',
  });
});

const findAdmins = expressAsyncHandler(async (req: Request, res: Response) => {
  const { id }: { id: string } = req.body;
  const admin = await Admin.findById(id);
  if (!admin) {
    res.status(403);
    throw new Error('Acceso no autorizado');
  }

  let adminQuery: Partial<IAdmin> = { deleted: false };

  switch (admin.role) {
    case 'national':
      adminQuery.country = admin.country;
      break;
    case 'state':
      adminQuery.state = admin.state;
      break;
    case 'city':
      adminQuery.city = admin.city;
      break;
    case 'local':
      if (!admin.storeId) {
        res.status(400);
        throw new Error('No se encontró tienda para este administrador');
      }
      adminQuery.storeId = admin.storeId;
      break;
    default:
      res.status(400);
      throw new Error('Rol inválido');
  }

  const admins = await Admin.find(adminQuery);

  res.status(200).json({
    error: false,
    admins,
  });
});

export { createAdmin, deleteAdmin, updateAdmin, findAdmins };
