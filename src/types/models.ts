import { Request } from 'express';
import { Types } from 'mongoose';
import { ROLE_OPTIONS } from '../constants/admin';
import { STATUS_OPTIONS } from '../constants/service';
import { SCHEDULE_OPTIONS } from '../constants/schedule';

export interface IStore {
  _id: Types.ObjectId;
  name: string;
  numStore: number;
  phone: string;
  address: string;
  district: string;
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
  phone: string;
  company: string;
  storeId: Types.ObjectId[];
  password: string;
  deleted: boolean;
}

export interface IJobDetails {
  quantity: number;
  description: string;
  installationServiceFee: number;
  commissionFee: number;
  installerPayment: number;
}

export interface IFeeBreakdown {
  installationServiceFee: number;
  commissionFee: number;
  installerPayment: number;
}

export interface IService {
  _id: Types.ObjectId;
  folio: number;
  client: string;
  clientPhone: string;
  address: string;
  jobDetails: IJobDetails;
  subtotals: IFeeBreakdown;
  iva: IFeeBreakdown;
  totals: IFeeBreakdown;
  additionalComments: string;
  adminId: Types.ObjectId;
  installerId: Types.ObjectId;
  storeId: Types.ObjectId;
  status: Status;
  deleted: boolean;
}

export interface ISchedule {
  _id: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  installerId: Types.ObjectId;
  serviceId: Types.ObjectId;
  type: ScheduleEntryType;
  description: string;
}

export interface IReceipt {
  _id: Types.ObjectId;
  serviceId: Types.ObjectId;
  receiptUrl: string;
  publicId: string;
}

export interface IInstalledProduct {
  installedProduct: string;
  installedIn: string;
  quantity: string;
  specification?: string;
  serialNumber?: string;
}

export type ScheduleEntryType =
  (typeof SCHEDULE_OPTIONS)[keyof typeof SCHEDULE_OPTIONS];

export type Role = (typeof ROLE_OPTIONS)[keyof typeof ROLE_OPTIONS];

export type Status = (typeof STATUS_OPTIONS)[keyof typeof STATUS_OPTIONS];

export interface AdminRequest extends Request {
  admin: IAdmin;
}

export interface InstallerRequest extends Request {
  installer: IInstaller;
}

export interface ReceiptData {
  startTime: string;
  endTime: string;
  installerName: string;
  installedProduct: IInstalledProduct;
  recommendations: string;
  clientComments: string;
  clientSignature: string;
  isClientAbsent: boolean;
  relationshipWithClient?: string;
  secondaryClientName?: string;
  serviceId: string;
  clientEmail: string;
}
