import express from 'express';
import {
  isAdmin,
  isInstaller,
  isRoleLocal,
  protect,
} from '../middlewares/authenticationMiddleware';
import {
  addExistingInstaller,
  createInstaller,
  deleteInstaller,
  findInstallerProfile,
  findInstallers,
  login,
  updateInstaller,
} from '../controllers/installerController';

const routerInstaller = express.Router();

routerInstaller.get('/', protect, isAdmin, findInstallers);
routerInstaller.get('/profile', protect, isInstaller, findInstallerProfile);
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
