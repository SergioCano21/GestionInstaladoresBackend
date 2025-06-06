import express from 'express';
import { isAdmin, protect } from '../middlewares/authenticationMiddleware';
import {
  createStore,
  deleteStore,
  findByAccess,
  updateStore,
} from '../controllers/storeController';

const routerStore = express.Router();

routerStore.get('/', protect, isAdmin, findByAccess);
routerStore.post('/', protect, isAdmin, createStore);
routerStore.put('/', protect, isAdmin, updateStore);
routerStore.delete('/', protect, isAdmin, deleteStore);

export default routerStore;
