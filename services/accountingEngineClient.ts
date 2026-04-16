export type AeVoucherLineInput = {
  account_id: string;
  debit?: number;
  credit?: number;
  sub_account_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  line_description?: string | null;
  currency_code?: string | null;
  exchange_rate?: number | null;
};

export type AeVoucherInput = {
  voucher_type: string;
  voucher_date: string;
  description?: string | null;
  currency_code?: string | null;
  exchange_rate?: number | null;
  source_type?: string | null;
  source_id?: string | null;
  created_by?: string | null;
  lines: AeVoucherLineInput[];
};

const getApi = () => {
  if (!window.electronAPI?.ae) {
    throw new Error('AE API is not available');
  }
  return window.electronAPI.ae;
};

export const AccountingEngineClient = {
  listSubAccounts(accountId?: string) {
    return getApi().listSubAccounts(accountId);
  },

  createSubAccount(payload: { account_id: string; name: string; code?: string | null }) {
    return getApi().createSubAccount(payload);
  },

  listReferences(refType?: string) {
    return getApi().listReferences(refType);
  },

  createReference(payload: { ref_type: string; ref_name: string; ref_code?: string | null }) {
    return getApi().createReference(payload);
  },

  saveDraftVoucher(payload: AeVoucherInput) {
    return getApi().saveDraftVoucher(payload);
  },

  postVoucher(payload: AeVoucherInput) {
    return getApi().postVoucher(payload);
  },

  postDraftVoucher(voucherId: string) {
    return getApi().postDraftVoucher(voucherId);
  },

  getVoucher(id: string) {
    return getApi().getVoucher(id);
  },

  getVouchers(filters?: { status?: string; fromDate?: string; toDate?: string; voucherType?: string }) {
    return getApi().getVouchers(filters);
  },

  getTrialBalance(params?: { fromDate?: string; toDate?: string }) {
    return getApi().getTrialBalance(params);
  }
};
