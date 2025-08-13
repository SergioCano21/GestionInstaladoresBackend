import express, { Router } from 'express';
import {
  createSchedule,
  deleteSchedule,
  findSchedule,
  updateSchedule,
} from '../controllers/scheduleController';
import { isRoleLocal, protect } from '../middlewares/authenticationMiddleware';

const routerSchedule: Router = express.Router();

routerSchedule.get('/', protect, findSchedule);
routerSchedule.post('/', protect, isRoleLocal, createSchedule);
routerSchedule.put('/:id', protect, isRoleLocal, updateSchedule);
routerSchedule.delete('/:id', protect, isRoleLocal, deleteSchedule);

export default routerSchedule;
