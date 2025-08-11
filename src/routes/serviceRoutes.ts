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
  restoreService,
  updateService,
} from '../controllers/serviceController';

const routerService: Router = express.Router();

routerService.get('/:status', protect, findService);
routerService.post('/', protect, isAdmin, isRoleLocal, createService);
routerService.put('/:id', protect, isAdmin, isRoleLocal, updateService);
routerService.delete('/:id', protect, isAdmin, isRoleLocal, deleteService);
routerService.put(
  '/:id/restore',
  protect,
  isAdmin,
  isRoleLocal,
  restoreService,
);

export default routerService;
