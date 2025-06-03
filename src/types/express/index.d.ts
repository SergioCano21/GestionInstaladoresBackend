import { IAdmin } from '../models';

declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
    }
  }
}
