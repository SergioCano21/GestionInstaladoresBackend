import { NextFunction, Request, Response } from 'express';

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode: number = req.statusCode ? req.statusCode : 500;

  res.status(statusCode).json({
    message: err.message,
    error: true,
  });
};

export default errorHandler;
