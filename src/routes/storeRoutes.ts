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
  restoreStore,
  updateStore,
} from '../controllers/storeController';

const routerStore = express.Router();

routerStore.get('/', protect, findStores);
routerStore.post('/', protect, isAdmin, isRoleDistrictOrNational, createStore);
routerStore.put(
  '/:id',
  protect,
  isAdmin,
  isRoleDistrictOrNational,
  updateStore,
);
routerStore.delete(
  '/:id',
  protect,
  isAdmin,
  isRoleDistrictOrNational,
  deleteStore,
);
routerStore.put(
  '/:id/restore',
  protect,
  isAdmin,
  isRoleDistrictOrNational,
  restoreStore,
);

export default routerStore;
