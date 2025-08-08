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
  validate,
  logout,
  restoreAdmin,
} from '../controllers/adminController';

const routerAdmin: Router = express.Router();

routerAdmin.get('/', protect, isAdmin, isRoleDistrictOrNational, findAdmins);
routerAdmin.post('/', protect, isAdmin, isRoleDistrictOrNational, createAdmin);
routerAdmin.put('/:id', protect, isAdmin, updateAdmin);
routerAdmin.delete(
  '/:id',
  protect,
  isAdmin,
  isRoleDistrictOrNational,
  deleteAdmin,
);
routerAdmin.post('/login', login);
routerAdmin.post('/logout', protect, logout);
routerAdmin.get('/auth', protect, isAdmin, validate);
routerAdmin.put(
  '/:id/restore',
  protect,
  isAdmin,
  isRoleDistrictOrNational,
  restoreAdmin,
);

export default routerAdmin;
