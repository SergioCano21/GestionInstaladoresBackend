import express, { Router } from 'express';
import {
  isAdmin,
  isRoleDistrictOrNational,
  protect,
} from '../middlewares/authenticationMiddleware';
import {
  login,
  createAdmin,
  findAdmins,
  updateAdmin,
  deleteAdmin,
} from '../controllers/adminController';

const routerAdmin: Router = express.Router();

routerAdmin.get('/', protect, isAdmin, isRoleDistrictOrNational, findAdmins);
routerAdmin.post('/', protect, isAdmin, isRoleDistrictOrNational, createAdmin);
routerAdmin.put('/', protect, isAdmin, updateAdmin);
routerAdmin.delete(
  '/',
  protect,
  isAdmin,
  isRoleDistrictOrNational,
  deleteAdmin,
);
routerAdmin.post('/login', login);

export default routerAdmin;
