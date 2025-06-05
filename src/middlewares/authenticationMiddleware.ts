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

      let exists;
      if (decoded.isAdmin) {
        exists = await Admin.findById(decoded.id);
      } else {
        exists = await Installer.findById(decoded.id);
      }

      if (!exists) {
        res.status(401);
        throw new Error('Error de autenticación');
      }

      next();
    } catch (error) {
      res.status(401);
      throw new Error('Acceso no autorizado');
    }
  },
);

export { protect };
