import express from 'express';
import {
  isAdmin,
  isRoleDistrictOrNational,
  protect,
} from '../middlewares/authenticationMiddleware';
import {
  createStore,
  deleteStore,
  findStores,
  updateStore,
} from '../controllers/storeController';

const routerStore = express.Router();

routerStore.get('/', protect, findStores);
routerStore.post('/', protect, isAdmin, isRoleDistrictOrNational, createStore);
routerStore.put('/', protect, isAdmin, isRoleDistrictOrNational, updateStore);
routerStore.delete(
  '/',
  protect,
  isAdmin,
  isRoleDistrictOrNational,
  deleteStore,
);

export default routerStore;
