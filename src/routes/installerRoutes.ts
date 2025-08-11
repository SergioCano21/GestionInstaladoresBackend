import express from 'express';
import {
  isAdmin,
  isRoleLocal,
  protect,
} from '../middlewares/authenticationMiddleware';
import {
  addExistingInstaller,
  createInstaller,
  deleteInstaller,
  findInstallers,
  login,
  updateInstaller,
} from '../controllers/installerController';

const routerInstaller = express.Router();

routerInstaller.get('/', protect, isAdmin, findInstallers);
routerInstaller.post('/', protect, isAdmin, isRoleLocal, createInstaller);
routerInstaller.put('/:id', protect, isAdmin, isRoleLocal, updateInstaller);
routerInstaller.delete('/:id', protect, isAdmin, isRoleLocal, deleteInstaller);
routerInstaller.post('/login', login);
routerInstaller.post(
  '/addExisting',
  protect,
  isAdmin,
  isRoleLocal,
  addExistingInstaller,
);

export default routerInstaller;
