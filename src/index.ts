import express, { Express } from 'express';
import dotenv from 'dotenv';
import errorHandler from './middlewares/errorMiddleware';
import connectDB from './config/db';

dotenv.config();

const app: Express = express();
const port: number = process.env.PORT ? Number(process.env.PORT) : 3000;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
