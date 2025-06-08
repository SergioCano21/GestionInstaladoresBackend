import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Admin from '../models/adminModel';
import { compare, genSalt, hash } from 'bcryptjs';
import { IAdmin } from '../types/models';
import jwt from 'jsonwebtoken';

const login = expressAsyncHandler(async (req: Request, res: Response) => {
  const { username, password }: { username: string; password: string } =
    req.body;

  if (!username || !password) {
    res.status(400);
    throw new Error('Faltan datos por ingresar');
  }

  const admin = await Admin.findOne({ username, deleted: false });

  if (!admin) {
    res.status(400);
    throw new Error('No se encontró al administrador');
  }

  const samePassword = await compare(password, admin.password);

  if (!samePassword) {
    res.status(400);
    throw new Error('Constraseña incorrecta');
  }

  const newToken = jwt.sign(
    { isAdmin: true, id: admin._id },
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

const createAdmin = expressAsyncHandler(async (req: Request, res: Response) => {
  let { username, password, name, email, storeId, role, district, country } =
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

  if (role == 'district' && !district) {
    res.status(400);
    throw new Error(
      'Falta agregar el distrito al que se está registrando el administrador',
    );
  }

  if (role == 'national' && !country) {
    res.status(400);
    throw new Error(
      'Falta agregar el país al que se está registrando el administrador',
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
    ...(district && { district }),
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
      ...(newAdmin.district && { state: newAdmin.district }),
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
    district,
    country,
  } = req.body;

  const admin = await Admin.findOne({ _id: id, deleted: false });
  if (!admin) {
    res.status(400);
    throw new Error('No se encontró al administrador');
  }
  admin.name = name || admin.name;
  admin.role = role || admin.role;

  if (username) {
    const usernameInUse = await Admin.findOne({ username });
    if (usernameInUse) {
      res.status(400);
      throw new Error('Ya existe un administrador con ese username');
    }
    admin.username = username;
  }

  if (email) {
    const emailInUse = await Admin.findOne({ email });
    if (emailInUse) {
      res.status(400);
      throw new Error('Ya existe un administrador con ese email');
    }
    admin.email = email;
  }

  if (storeId != null) admin.storeId = storeId;
  if (district != null) admin.district = district;
  if (country != null) admin.country = country;

  if (admin.role == 'national' && !admin.country) {
    res.status(400);
    throw new Error('Falta agregar país para cambiar de rol');
  }

  if (admin.role == 'district' && !admin.district) {
    res.status(400);
    throw new Error('Falta agregar distrito para cambiar de rol');
  }

  if (admin.role == 'local' && !admin.storeId) {
    res.status(400);
    throw new Error('Falta agregar tienda para cambiar de rol');
  }

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
      ...(admin.district && { city: admin.district }),
      ...(admin.country && { country: admin.country }),
    },
    message: 'Administrador actualizado correctamente',
  });
});

const findAdmins = expressAsyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  if (!admin) {
    res.status(403);
    throw new Error('Acceso no autorizado');
  }

  let adminQuery: Partial<IAdmin> = { deleted: false };

  switch (admin.role) {
    case 'national':
      adminQuery.country = admin.country ?? '';
      break;
    case 'district':
      adminQuery.district = admin.district ?? '';
      break;
    case 'local':
      if (!admin.storeId) {
        res.status(400);
        throw new Error('No se encontró tienda para este administrador');
      }
      adminQuery.storeId = admin.storeId ?? '';
      break;
    default:
      res.status(400);
      throw new Error('Rol inválido');
  }
  const admins = await Admin.find(adminQuery).select('-password');

  res.status(200).json({
    error: false,
    admins,
  });
});

export { createAdmin, deleteAdmin, updateAdmin, findAdmins, login };
