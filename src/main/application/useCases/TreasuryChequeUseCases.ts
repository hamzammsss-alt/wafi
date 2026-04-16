import {
    CancelChequeCommand,
    ClearIssuedChequeCommand,
    ClearReceivedChequeCommand,
    DepositChequeCommand,
    ReturnReceivedChequeCommand,
} from '../../domain/treasury/types/TreasuryTypes';
import {
    TreasuryChequeLifecycleResult,
    TreasuryChequeLifecycleService,
} from '../services/TreasuryChequeLifecycleService';

export class TreasuryChequeUseCases {
    constructor(private readonly service: TreasuryChequeLifecycleService) {}

    deposit(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: DepositChequeCommand,
    ): Promise<TreasuryChequeLifecycleResult> {
        return this.service.depositCheque(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            {
                chequeId: String(input?.chequeId || '').trim(),
                bankAccountId: String(input?.bankAccountId || '').trim(),
                date: String(input?.date || '').trim(),
                reason: input?.reason || null,
            },
        );
    }

    clearReceived(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ClearReceivedChequeCommand,
    ): Promise<TreasuryChequeLifecycleResult> {
        return this.service.clearReceivedCheque(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            {
                chequeId: String(input?.chequeId || '').trim(),
                date: String(input?.date || '').trim(),
                reason: input?.reason || null,
            },
        );
    }

    returnReceived(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ReturnReceivedChequeCommand,
    ): Promise<TreasuryChequeLifecycleResult> {
        return this.service.returnReceivedCheque(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            {
                chequeId: String(input?.chequeId || '').trim(),
                date: String(input?.date || '').trim(),
                reason: input?.reason || null,
            },
        );
    }

    clearIssued(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ClearIssuedChequeCommand,
    ): Promise<TreasuryChequeLifecycleResult> {
        return this.service.clearIssuedCheque(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            {
                chequeId: String(input?.chequeId || '').trim(),
                date: String(input?.date || '').trim(),
                reason: input?.reason || null,
            },
        );
    }

    cancel(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CancelChequeCommand,
    ): Promise<TreasuryChequeLifecycleResult> {
        return this.service.cancelCheque(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            {
                chequeId: String(input?.chequeId || '').trim(),
                date: String(input?.date || '').trim(),
                reason: input?.reason || null,
            },
        );
    }
}