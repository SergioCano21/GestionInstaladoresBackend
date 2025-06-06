import express, { Router } from 'express';
import { isAdmin, protect } from '../middlewares/authenticationMiddleware';
import {
  login,
  createAdmin,
  findAdmins,
  updateAdmin,
  deleteAdmin,
} from '../controllers/adminController';

const routerAdmin: Router = express.Router();

routerAdmin.get('/', protect, isAdmin, findAdmins);
routerAdmin.post('/', protect, isAdmin, createAdmin);
routerAdmin.put('/', protect, isAdmin, updateAdmin);
routerAdmin.delete('/', protect, isAdmin, deleteAdmin);
routerAdmin.post('/login', login);

export default routerAdmin;
