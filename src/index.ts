import express, { Express } from 'express';
import dotenv from 'dotenv';
import errorHandler from './middlewares/errorMiddleware';
import connectDB from './config/db';
import routerAdmin from './routes/adminRoutes';
import routerStore from './routes/storeRoutes';
import routerInstaller from './routes/installerRoutes';
import cookieParser from 'cookie-parser';
import routerService from './routes/serviceRoutes';
import routerSchedule from './routes/scheduleRoutes';
import routerReceipt from './routes/receiptRoutes';

dotenv.config();

const app: Express = express();
const port: number = process.env.PORT ? Number(process.env.PORT) : 3000;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api/admin', routerAdmin);
app.use('/api/installer', routerInstaller);
app.use('/api/store', routerStore);
app.use('/api/service', routerService);
app.use('/api/schedule', routerSchedule);
app.use('/api/receipt', routerReceipt);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
