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
          res.status(400);
          throw new Error('No se encontró administrador con ese token');
        }
        req.admin = admin;
      } else {
        const installer = await Installer.findById(decoded.id);
        if (!installer) {
          res.status(400);
          throw new Error('No se encontró instalador con ese token');
        }
      }
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Acceso no autorizado');
    }
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
export { protect, isAdmin };
