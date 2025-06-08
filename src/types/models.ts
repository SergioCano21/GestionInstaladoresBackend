import { Request } from 'express';
import { Types } from 'mongoose';

export interface IStore {
  _id: Types.ObjectId;
  name: string;
  numStore: number;
  district: string;
  city: string;
  state: string;
  country: string;
  deleted: boolean;
}

export interface IAdmin {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: Role;
  username: string;
  password: string;
  storeId?: Types.ObjectId;
  district?: string;
  country?: string;
  deleted: boolean;
}

export interface IInstaller {
  _id: Types.ObjectId;
  installerId: number;
  name: string;
  email: string;
  phone: Number;
  company: string;
  storeId: Types.ObjectId[];
  password: string;
  deleted: boolean;
}

export type Role = 'local' | 'district' | 'national';

export interface AdminRequest extends Request {
  admin: IAdmin;
}

export interface InstallerRequest extends Request {
  installer: IInstaller;
}
