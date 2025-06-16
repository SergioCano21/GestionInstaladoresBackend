import express, { Router } from 'express';
import { createReceipt, findReceipt } from '../controllers/receiptController';
import { isInstaller, protect } from '../middlewares/authenticationMiddleware';

const routerReceipt: Router = express.Router();

routerReceipt.get('/', protect, findReceipt);
routerReceipt.post('/', protect, isInstaller, createReceipt);

export default routerReceipt;
