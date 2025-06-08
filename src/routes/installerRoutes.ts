import express from 'express';
import {
  isAdmin,
  isRoleLocal,
  protect,
} from '../middlewares/authenticationMiddleware';
import {
  createInstaller,
  deleteInstaller,
  findInstallers,
  login,
  updateInstaller,
} from '../controllers/installerController';

const routerInstaller = express.Router();

routerInstaller.get('/', protect, isAdmin, findInstallers);
routerInstaller.post('/', protect, isAdmin, isRoleLocal, createInstaller);
routerInstaller.put('/', protect, isAdmin, isRoleLocal, updateInstaller);
routerInstaller.delete('/', protect, isAdmin, isRoleLocal, deleteInstaller);
routerInstaller.post('/login', login);

export default routerInstaller;
