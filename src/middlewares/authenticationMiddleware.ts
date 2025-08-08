import { NextFunction, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import Admin from '../models/adminModel';
import Installer from '../models/installerModel';

const protect = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token: string = req.cookies.access_token;
    if (!token) {
      res.status(401);
      throw new Error('Acceso no autorizado');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        isAdmin?: boolean;
      };

      if (decoded.isAdmin) {
        const admin = await Admin.findOne({
          _id: decoded.id,
          deleted: false,
        }).select('-password');
        if (!admin) {
          res.status(401);
          throw new Error('No se encontró administrador con ese token');
        }
        req.admin = admin;
      } else {
        const installer = await Installer.findById(decoded.id).select(
          '-password',
        );
        if (!installer) {
          res.status(401);
          throw new Error('No se encontró instalador con ese token');
        }
        req.installer = installer;
      }
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Acceso no autorizado');
    }
  },
);

const isInstaller = expressAsyncHandler(
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.installer) {
      res.status(401);
      throw new Error('Acceso no autorizado');
    }
    next();
  },
);

const isAdmin = expressAsyncHandler(
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      res.status(401);
      throw new Error('Acceso no autorizado');
    }
    next();
  },
);

const isRoleLocal = expressAsyncHandler(
  (req: Request, res: Response, next: NextFunction) => {
    if (req.admin?.role != 'local') {
      res.status(401);
      throw new Error(
        'Solo administradores con rol local pueden realizar modificaciones',
      );
    }
    next();
  },
);

const isRoleDistrictOrNational = expressAsyncHandler(
  (req: Request, res: Response, next: NextFunction) => {
    if (req.admin?.role == 'local') {
      res.status(401);
      throw new Error(
        'Solo administradores con rol distrito o nacional pueden realizar modificaciones',
      );
    }
    next();
  },
);

export { protect, isAdmin, isRoleLocal, isRoleDistrictOrNational, isInstaller };
