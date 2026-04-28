import { JournalVoucherLine } from './journalVoucherClient';

export type PurchaseAccount = {
    id?: string;
    code?: string;
    account_code?: string;
    name?: string;
    name_ar?: string;
    name_en?: string;
};

export type PurchaseSupplier = {
    id?: string;
    code?: string;
    name?: string;
    nameAr?: string | null;
    name_ar?: string | null;
    nameEn?: string | null;
    name_en?: string | null;
    payableAccountId?: string | null;
    payable_account_id?: string | null;
};

export type FixedAssetPurchaseInput = {
    assetId?: string | null;
    assetCode: string;
    assetName: string;
    purchaseDate: string;
    assetAccountId: string;
    assetAccount?: PurchaseAccount | null;
    supplierId: string;
    supplier?: PurchaseSupplier | null;
    supplierAccountId: string;
    supplierAccount?: PurchaseAccount | null;
    supplierInvoiceNo?: string | null;
    supplierInvoiceAmount: number;
    clearanceCost?: number;
    clearanceAccountId?: string | null;
    clearanceAccount?: PurchaseAccount | null;
};

const nextLineId = () => `asset_purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function unwrapIpcRows<T = any>(response: any): T[] {
    const data = response?.ok === true ? response.data : response;
    if (Array.isArray(data)) return data as T[];
    if (Array.isArray(data?.rows)) return data.rows as T[];
    return [];
}

export function accountCode(account?: PurchaseAccount | null): string {
    return String(account?.code || account?.account_code || '').trim();
}

export function accountName(account?: PurchaseAccount | null): string {
    return String(account?.name || account?.name_ar || account?.name_en || '').trim();
}

export function accountLabel(account?: PurchaseAccount | null): string {
    return [accountCode(account), accountName(account)].filter(Boolean).join(' - ');
}

export function supplierLabel(supplier?: PurchaseSupplier | null): string {
    if (!supplier) return '';
    return [
        String(supplier.code || '').trim(),
        String(supplier.nameAr || supplier.name_ar || supplier.name || supplier.nameEn || supplier.name_en || '').trim(),
    ].filter(Boolean).join(' - ');
}

export function supplierPayableAccountId(supplier?: PurchaseSupplier | null): string {
    return String(supplier?.payableAccountId || supplier?.payable_account_id || '').trim();
}

export function toMoney(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function buildFixedAssetPurchaseLines(input: FixedAssetPurchaseInput): JournalVoucherLine[] {
    const supplierAmount = Math.max(0, toMoney(input.supplierInvoiceAmount));
    const invoiceRef = String(input.supplierInvoiceNo || input.assetCode || '').trim();
    const assetDescription = `شراء أصل ثابت: ${input.assetCode} - ${input.assetName}`;
    return [
        {
            id: nextLineId(),
            account_id: input.assetAccountId,
            account_code_lookup: accountCode(input.assetAccount) || input.assetAccountId,
            account_name: accountName(input.assetAccount),
            invoice_ref: invoiceRef,
            description: assetDescription,
            debit: supplierAmount,
            credit: 0,
        },
        {
            id: nextLineId(),
            account_id: input.supplierAccountId,
            account_code_lookup: accountCode(input.supplierAccount) || input.supplierAccountId,
            account_name: accountName(input.supplierAccount),
            invoice_ref: invoiceRef,
            sub_account_id: input.supplierId,
            description: `ذمم مورد أصل ثابت: ${input.assetCode}`,
            debit: 0,
            credit: supplierAmount,
        },
    ];
}

export function buildFixedAssetClearanceLines(input: FixedAssetPurchaseInput): JournalVoucherLine[] {
    const clearanceAmount = Math.max(0, toMoney(input.clearanceCost));
    if (clearanceAmount <= 0) return [];
    const invoiceRef = String(input.supplierInvoiceNo || input.assetCode || '').trim();
    return [
        {
            id: nextLineId(),
            account_id: input.assetAccountId,
            account_code_lookup: accountCode(input.assetAccount) || input.assetAccountId,
            account_name: accountName(input.assetAccount),
            invoice_ref: invoiceRef,
            description: `رسملة مصاريف التخليص على الأصل: ${input.assetCode}`,
            debit: clearanceAmount,
            credit: 0,
        },
        {
            id: nextLineId(),
            account_id: input.clearanceAccountId,
            account_code_lookup: accountCode(input.clearanceAccount) || input.clearanceAccountId,
            account_name: accountName(input.clearanceAccount),
            invoice_ref: invoiceRef,
            description: `مصاريف تخليص أصل ثابت: ${input.assetCode}`,
            debit: 0,
            credit: clearanceAmount,
        },
    ];
}

export function validateFixedAssetPurchaseInput(input: FixedAssetPurchaseInput): string {
    const supplierAmount = Math.max(0, toMoney(input.supplierInvoiceAmount));
    const clearanceAmount = Math.max(0, toMoney(input.clearanceCost));
    if (!String(input.assetCode || '').trim()) return 'رمز الأصل مطلوب.';
    if (!String(input.assetName || '').trim()) return 'اسم الأصل مطلوب.';
    if (!String(input.purchaseDate || '').trim()) return 'تاريخ الشراء مطلوب.';
    if (!input.assetAccountId) return 'حساب الأصل مطلوب لإنشاء قيد شراء الأصل.';
    if (!input.supplierId) return 'تحديد المورد مطلوب لإنشاء قيد شراء الأصل.';
    if (!input.supplierAccountId) return 'حساب المورد الدائن مطلوب لإنشاء قيد شراء الأصل.';
    if (supplierAmount <= 0) return 'قيمة فاتورة المورد يجب أن تكون أكبر من صفر.';
    if (clearanceAmount > 0 && !input.clearanceAccountId) return 'حساب دائن مصاريف التخليص مطلوب عند إدخال مصاريف تخليص.';
    return '';
}
