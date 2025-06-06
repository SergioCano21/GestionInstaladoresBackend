import express from 'express';
import { protect } from '../middlewares/authenticationMiddleware';
import {
  createInstaller,
  deleteInstaller,
  findInstallers,
  login,
  updateInstaller,
} from '../controllers/installerController';

const routerInstaller = express.Router();

routerInstaller.get('/', protect, findInstallers);
routerInstaller.post('/', protect, createInstaller);
routerInstaller.put('/', protect, updateInstaller);
routerInstaller.delete('/', protect, deleteInstaller);
routerInstaller.post('/login', login);

export default routerInstaller;
