import express from 'express';
import { isAdmin, protect } from '../middlewares/authenticationMiddleware';
import {
  createInstaller,
  deleteInstaller,
  findInstallers,
  login,
  updateInstaller,
} from '../controllers/installerController';

const routerInstaller = express.Router();

routerInstaller.get('/', protect, isAdmin, findInstallers);
routerInstaller.post('/', protect, isAdmin, createInstaller);
routerInstaller.put('/', protect, isAdmin, updateInstaller);
routerInstaller.delete('/', protect, isAdmin, deleteInstaller);
routerInstaller.post('/login', login);

export default routerInstaller;
