import express from 'express';
import { protect } from '../middlewares/authenticationMiddleware';
import {
  createStore,
  deleteStore,
  findByAccess,
  updateStore,
} from '../controllers/storeController';

const routerStore = express.Router();

routerStore.get('/', protect, findByAccess);
routerStore.post('/', protect, createStore);
routerStore.put('/', protect, updateStore);
routerStore.delete('/', protect, deleteStore);

export default routerStore;
