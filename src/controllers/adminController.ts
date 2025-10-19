import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Admin from '../models/adminModel';
import { compare, genSalt, hash } from 'bcryptjs';
import { IAdmin } from '../types/models';
import jwt from 'jsonwebtoken';
import Store from '../models/storeModel';

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
    { expiresIn: '7d' },
  );
  res
    .status(200)
    .cookie('access_token', newToken, {
      httpOnly: false,
      sameSite: 'none',
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    })
    .json({
      message: 'Login realizado con éxito',
      error: false,
      admin: {
        role: admin.role,
        name: admin.name,
      },
    });
});

const validate = expressAsyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Token válido',
    error: false,
    admin: {
      role: req.admin?.role,
      name: req.admin?.name,
    },
  });
});

const logout = expressAsyncHandler(async (_req: Request, res: Response) => {
  res.status(200).clearCookie('access_token').json({
    message: 'Logout realizado con éxito',
    error: false,
  });
});

const createAdmin = expressAsyncHandler(async (req: Request, res: Response) => {
  let { username, name, email, storeId, role, district, country } = req.body;

  // Temporal fix
  const password = '123456';
  //

  if (!username || !name || !email || !role) {
    res.status(400);
    throw new Error('Falta ingresar datos del administrador');
  }

  if (role === 'local') {
    if (!storeId) {
      res.status(400);
      throw new Error(
        'Falta agregar tienda a la que se está registrando el administrador',
      );
    }
    const store = await Store.findById(storeId);
    if (!store) {
      res.status(400);
      throw new Error('La tienda no existe');
    }
    district = store.district;
    country = store.country;
  }

  if (role === 'district' && !district && !country) {
    res.status(400);
    throw new Error(
      'Falta agregar el distrito y país al que se está registrando el administrador',
    );
  }

  if (role === 'national' && !country) {
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
  const { id } = req.params;
  const deletedAdmin = await Admin.findOneAndUpdate(
    { _id: id },
    { deleted: true },
    { new: true },
  );
  if (!deletedAdmin || !deletedAdmin.deleted) {
    res.status(400);
    throw new Error('Error al intentar eliminar al administrador');
  }
  res.status(200).json({
    message: 'Administrador eliminado correctamente',
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
  const { name, email, username, password, storeId, role, district, country } =
    req.body;

  const { id } = req.params;

  const admin = await Admin.findOne({ _id: id, deleted: false });

  if (!admin) {
    res.status(400);
    throw new Error('No se encontró al administrador');
  }

  if (name && name !== admin.name) admin.name = name;
  if (role && role !== admin.role) admin.role = role;

  if (username && username !== admin.username) {
    const usernameInUse = await Admin.findOne({ username });
    if (
      usernameInUse &&
      usernameInUse._id.toString() !== admin._id.toString()
    ) {
      res.status(400);
      throw new Error('Ya existe un administrador con ese username');
    }
    admin.username = username;
  }

  if (email && email !== admin.email) {
    const emailInUse = await Admin.findOne({ email });
    if (emailInUse && emailInUse._id.toString() !== admin._id.toString()) {
      res.status(400);
      throw new Error('Ya existe un administrador con ese email');
    }
    admin.email = email;
  }

  if (storeId) admin.storeId = storeId;
  if (district) admin.district = district;
  if (country) admin.country = country;

  if (admin.role === 'national') {
    if (!admin.country) {
      res.status(400);
      throw new Error('Falta agregar país para cambiar de rol');
    }
    admin.district = undefined;
    admin.storeId = undefined;
  }

  if (admin.role === 'district') {
    if (!admin.district || !admin.country) {
      res.status(400);
      throw new Error('Falta agregar distrito y país para cambiar de rol');
    }
    admin.storeId = undefined;
  }

  if (admin.role === 'local') {
    if (!admin.storeId) {
      res.status(400);
      throw new Error('Falta agregar tienda para cambiar de rol');
    }

    const store = await Store.findById(admin.storeId);
    if (!store) {
      res.status(400);
      throw new Error('La tienda no existe');
    }
    admin.district = store.district;
    admin.country = store.country;
  }

  if (password) {
    const salt: string = await genSalt(10);
    const hashedPassword: string = await hash(password, salt);
    admin.password = hashedPassword;
  }

  await admin.save();

  res.status(200).json({
    error: false,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      ...(admin.storeId && { storeId: admin.storeId }),
      ...(admin.district && { district: admin.district }),
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

  let adminQuery: Partial<IAdmin> = {};

  switch (admin.role) {
    case 'national':
      if (!admin.country) {
        res.status(400);
        throw new Error('Faltan datos para la busqueda');
      }
      adminQuery.country = admin.country;
      break;
    case 'district':
      if (!admin.district) {
        res.status(400);
        throw new Error('Faltan datos para la busqueda');
      }
      adminQuery.district = admin.district;
      break;
    case 'local':
      if (!admin.storeId) {
        res.status(400);
        throw new Error('No se encontró tienda para este administrador');
      }
      break;
    default:
      res.status(400);
      throw new Error('Rol inválido');
  }

  const admins = await Admin.find(adminQuery)
    .populate({ path: 'storeId', select: '_id numStore name' })
    .select('-password -createdAt -updatedAt -__v')
    .lean();

  res.status(200).json({
    error: false,
    message: 'Administradores encontados',
    admins,
  });
});

const restoreAdmin = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400);
      throw new Error('No se proporcionó el id del administador');
    }

    const admin = await Admin.findOne({ _id: id, deleted: true });

    if (!admin) {
      res.status(404);
      throw new Error('No se encontró al administrador');
    }

    admin.deleted = false;

    await admin.save();

    res.status(200).json({
      message: 'Administeador restaurado correctamente',
      error: false,
    });
  },
);

export {
  createAdmin,
  deleteAdmin,
  updateAdmin,
  findAdmins,
  login,
  validate,
  logout,
  restoreAdmin,
};
