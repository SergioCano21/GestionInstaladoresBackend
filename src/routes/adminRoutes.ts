import express, { Router } from 'express';
import { protect } from '../middlewares/authenticationMiddleware';
import {
  login,
  createAdmin,
  findAdmins,
  updateAdmin,
  deleteAdmin,
} from '../controllers/adminController';

const routerAdmin: Router = express.Router();

routerAdmin.get('/', protect, findAdmins);
routerAdmin.post('/', protect, createAdmin);
routerAdmin.put('/', protect, updateAdmin);
routerAdmin.delete('/', protect, deleteAdmin);
routerAdmin.post('/login', login);

export default routerAdmin;
