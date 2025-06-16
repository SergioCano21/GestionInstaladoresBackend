import { IAdmin, IInstaller } from '../models';

declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
      installer?: IInstaller;
    }
  }
}
