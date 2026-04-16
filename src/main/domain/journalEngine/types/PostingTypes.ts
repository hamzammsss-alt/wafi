import { JournalStatus } from './JournalStatus';

export interface PostingLineInput {
    lineNo?: number;
    accountId: string;
    description?: string | null;
    debit: number;
    credit: number;
    currencyCode?: string | null;
    exchangeRate?: number | null;
    baseDebit?: number | null;
    baseCredit?: number | null;
    branchId?: string | null;
    costCenterId?: string | null;
    expenseTypeId?: string | null;
    vehicleId?: string | null;
    partnerId?: string | null;
    projectId?: string | null;
    itemId?: string | null;
    warehouseId?: string | null;
}

export interface PostingCommand {
    companyId: string;
    branchId: string;
    journalDate: string;
    fiscalPeriodId?: string | null;
    sourceType: string;
    sourceId: string;
    sourceNo?: string | null;
    sourceVersion?: number;
    referenceNo?: string | null;
    description?: string | null;
    currencyCode: string;
    exchangeRate: number;
    totalDebit?: number | null;
    totalCredit?: number | null;
    postedBy: string;
    lines: PostingLineInput[];
}

export interface PostingValidationIssue {
    code: string;
    message: string;
    lineNo?: number;
    accountId?: string;
    details?: Record<string, unknown>;
}

export interface PostingValidationResult {
    isValid: boolean;
    fiscalPeriodId: string | null;
    totals: {
        lineCount: number;
        totalDebit: number;
        totalCredit: number;
    };
    issues: PostingValidationIssue[];
}

export interface ReverseJournalCommand {
    companyId: string;
    journalId: string;
    reverseDate: string;
    sourceType?: string | null;
    sourceId?: string | null;
    sourceNo?: string | null;
    sourceVersion?: number;
    referenceNo?: string | null;
    reason?: string | null;
    postedBy: string;
}

export interface PostJournalResult {
    journalId: string;
    journalNo: string;
    status: JournalStatus;
    fiscalPeriodId: string;
    totals: {
        totalDebit: number;
        totalCredit: number;
    };
    postingRegistryId: string;
}

export interface ReverseJournalResult {
    originalJournalId: string;
    reversalJournalId: string;
    reversalJournalNo: string;
    status: JournalStatus;
}
