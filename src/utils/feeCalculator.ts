import { IFeeBreakdown, IJobDetails } from '../types/models';

const IVA_RATE = 0.16;
const COMMISSION_RATE = 0.2;

const floor2 = (n: number) => Math.floor(n * 100) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateFees(jobDetails: IJobDetails[]) {
  let installationServiceFee = 0;
  let commissionFee = 0;
  let installerPayment = 0;

  const updatedJobDetails = jobDetails.map((jobDetail) => {
    const commission = floor2(
      jobDetail.installationServiceFee * COMMISSION_RATE,
    );

    const installerPay = jobDetail.installationServiceFee - commission;

    installationServiceFee += jobDetail.installationServiceFee;
    commissionFee += commission;
    installerPayment += installerPay;

    return {
      ...jobDetail,
      commissionFee: commission,
      installerPayment: installerPay,
    };
  });

  const subtotals: IFeeBreakdown = {
    installationServiceFee: floor2(installationServiceFee / (1 + IVA_RATE)),
    commissionFee: floor2(commissionFee / (1 + IVA_RATE)),
    installerPayment: floor2(installerPayment / (1 + IVA_RATE)),
  };

  const iva: IFeeBreakdown = {
    installationServiceFee: round2(subtotals.installationServiceFee * IVA_RATE),
    commissionFee: round2(subtotals.commissionFee * IVA_RATE),
    installerPayment: round2(subtotals.installerPayment * IVA_RATE),
  };

  const totals: IFeeBreakdown = {
    installationServiceFee:
      subtotals.installationServiceFee + iva.installationServiceFee,
    commissionFee: subtotals.commissionFee + iva.commissionFee,
    installerPayment: subtotals.installerPayment + iva.commissionFee,
  };

  return {
    jobDetails: updatedJobDetails,
    subtotals,
    iva,
    totals,
  };
}
