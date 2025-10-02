import express, { Router } from 'express';
import {
  createSchedule,
  deleteSchedule,
  findSchedule,
  updateSchedule,
} from '../controllers/scheduleController';
import {
  isRoleLocalAndInstaller,
  protect,
} from '../middlewares/authenticationMiddleware';

const routerSchedule: Router = express.Router();

routerSchedule.get('/', protect, findSchedule);
routerSchedule.post('/', protect, isRoleLocalAndInstaller, createSchedule);
routerSchedule.put('/:id', protect, isRoleLocalAndInstaller, updateSchedule);
routerSchedule.delete('/:id', protect, isRoleLocalAndInstaller, deleteSchedule);

export default routerSchedule;
