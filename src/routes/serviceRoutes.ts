import express, { Router } from 'express';
import {
  isAdmin,
  isRoleLocal,
  protect,
} from '../middlewares/authenticationMiddleware';
import {
  createService,
  deleteService,
  findService,
  updateService,
} from '../controllers/serviceController';

const routerService: Router = express.Router();

routerService.get('/', protect, findService);
routerService.post('/', protect, isAdmin, isRoleLocal, createService);
routerService.put('/', protect, isAdmin, isRoleLocal, updateService);
routerService.delete('/', protect, isAdmin, isRoleLocal, deleteService);

export default routerService;
