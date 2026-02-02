import { IFeeBreakdown, IJobDetails } from '../types/models';

const IVA_RATE = 0.16;

const round2 = (n: number) => Math.floor(n * 100) / 100;

export function calculateFees(jobDetails: IJobDetails[]) {
  let installationServiceFee = 0;
  let commissionFee = 0;
  let installerPayment = 0;

  const updatedJobDetails = jobDetails.map((jobDetail) => {
    const commission = round2(jobDetail.installationServiceFee * 0.2);

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

  const totals: IFeeBreakdown = {
    installationServiceFee,
    commissionFee,
    installerPayment,
  };

  const subtotals: IFeeBreakdown = {
    installationServiceFee: round2(
      totals.installationServiceFee / (1 + IVA_RATE),
    ),
    commissionFee: round2(totals.commissionFee / (1 + IVA_RATE)),
    installerPayment: round2(totals.installerPayment / (1 + IVA_RATE)),
  };

  const iva: IFeeBreakdown = {
    installationServiceFee: round2(subtotals.installationServiceFee * IVA_RATE),
    commissionFee: round2(subtotals.commissionFee * IVA_RATE),
    installerPayment: round2(subtotals.installerPayment * IVA_RATE),
  };

  return {
    jobDetails: updatedJobDetails,
    subtotals,
    iva,
    totals,
  };
}
