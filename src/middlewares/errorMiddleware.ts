import { NextFunction, Request, Response } from 'express';

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode: number = res.statusCode ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message,
    error: true,
  });
};

export default errorHandler;
