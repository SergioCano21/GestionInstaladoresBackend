import { Request, Response } from 'express';

const errorHandler = (err: Error, req: Request, res: Response) => {
  const statusCode: number = req.statusCode ? req.statusCode : 500;

  res.status(statusCode).json({
    message: err.message,
    error: true,
  });
};

export default errorHandler;
