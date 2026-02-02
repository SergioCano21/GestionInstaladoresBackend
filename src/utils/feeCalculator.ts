import { IFeeBreakdown, IJobDetails } from '../types/models';

const IVA_RATE = 0.16;
const COMMISSION_RATE = 0.2;

const floor2 = (n: number) => Math.floor(n * 100) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateFees(jobDetails: IJobDetails) {
  const subtotalServiceFee = round2(
    jobDetails.installationServiceFee / (1 + IVA_RATE),
  );
  const subtotalComissionFee = floor2(subtotalServiceFee * COMMISSION_RATE);

  const subtotals: IFeeBreakdown = {
    installationServiceFee: subtotalServiceFee,
    commissionFee: subtotalComissionFee,
    installerPayment: subtotalServiceFee - subtotalComissionFee,
  };

  const iva: IFeeBreakdown = {
    installationServiceFee: round2(subtotals.installationServiceFee * IVA_RATE),
    commissionFee: round2(subtotals.commissionFee * IVA_RATE),
    installerPayment: round2(subtotals.installerPayment * IVA_RATE),
  };

  const totals: IFeeBreakdown = {
    installationServiceFee: jobDetails.installationServiceFee,
    commissionFee: subtotals.commissionFee + iva.commissionFee,
    installerPayment: subtotals.installerPayment + iva.installerPayment,
  };

  const updatedJobDetails: IJobDetails = {
    ...jobDetails,
    commissionFee: totals.commissionFee,
    installerPayment: totals.installerPayment,
  };

  return {
    jobDetails: updatedJobDetails,
    subtotals,
    iva,
    totals,
  };
}
