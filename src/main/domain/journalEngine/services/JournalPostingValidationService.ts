import {
    AccountLookupRepositoryPort,
    FiscalPeriodRepositoryPort,
    PostingRegistryRepositoryPort,
} from '../../../application/ports/JournalEnginePorts';
import { Money } from '../../valueObjects/Money';
import { PostingCommand, PostingValidationResult } from '../types/PostingTypes';

export class JournalPostingValidationService {
    constructor(
        private readonly accountsRepo: AccountLookupRepositoryPort,
        private readonly fiscalPeriodRepo: FiscalPeriodRepositoryPort,
        private readonly postingRegistryRepo: PostingRegistryRepositoryPort,
    ) {}

    validate(command: PostingCommand): PostingValidationResult {
        const issues: PostingValidationResult['issues'] = [];
        const lines = command.lines || [];
        let totalDebit = 0;
        let totalCredit = 0;

        if (!lines.length) {
            issues.push({
                code: 'ERR_JOURNAL_LINES_EMPTY',
                message: 'Journal lines are required',
            });
        }

        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            const lineNo = Number(line.lineNo || index + 1);
            const debit = Money.round(Number(line.baseDebit ?? line.debit ?? 0));
            const credit = Money.round(Number(line.baseCredit ?? line.credit ?? 0));

            totalDebit = Money.round(totalDebit + debit);
            totalCredit = Money.round(totalCredit + credit);

            if (debit > 0 && credit > 0) {
                issues.push({
                    code: 'ERR_JOURNAL_LINE_BOTH_DEBIT_CREDIT',
                    message: 'A line cannot contain both debit and credit',
                    lineNo,
                    accountId: line.accountId,
                });
            }

            if (debit === 0 && credit === 0) {
                issues.push({
                    code: 'ERR_JOURNAL_LINE_ZERO_VALUE',
                    message: 'A line cannot contain zero debit and zero credit',
                    lineNo,
                    accountId: line.accountId,
                });
            }

            const accountState = this.accountsRepo.getPostingValidationState(command.companyId, line.accountId);
            if (!accountState.exists) {
                issues.push({
                    code: 'ERR_ACCOUNT_NOT_FOUND',
                    message: `Account ${line.accountId} does not exist`,
                    lineNo,
                    accountId: line.accountId,
                });
                continue;
            }

            if (!accountState.isActive) {
                issues.push({
                    code: 'ERR_ACCOUNT_INACTIVE',
                    message: `Account ${line.accountId} is inactive`,
                    lineNo,
                    accountId: line.accountId,
                });
            }

            if (!accountState.isPosting) {
                issues.push({
                    code: 'ERR_ACCOUNT_NOT_POSTING',
                    message: `Account ${line.accountId} is not a posting account`,
                    lineNo,
                    accountId: line.accountId,
                });
            }
        }

        const periodId = this.fiscalPeriodRepo.resolveOpenPeriodId(command.companyId, command.journalDate);
        if (!periodId) {
            issues.push({
                code: 'ERR_FISCAL_PERIOD_NOT_OPEN',
                message: 'Fiscal period is not open for journal date',
            });
        }

        const sourceVersion = Number(command.sourceVersion || 1);
        const duplicate = this.postingRegistryRepo.findBySource(
            command.companyId,
            command.sourceType,
            command.sourceId,
            sourceVersion,
        );
        if (duplicate) {
            issues.push({
                code: 'ERR_SOURCE_ALREADY_POSTED',
                message: 'Source document version has already been posted',
                details: {
                    duplicateJournalId: duplicate.journalId,
                    duplicateRegistryId: duplicate.id,
                },
            });
        }

        if (Money.round(totalDebit - totalCredit) !== 0) {
            issues.push({
                code: 'ERR_JOURNAL_NOT_BALANCED',
                message: 'Journal is not balanced',
                details: {
                    totalDebit,
                    totalCredit,
                },
            });
        }

        if (command.totalDebit != null && Money.round(Number(command.totalDebit) - totalDebit) !== 0) {
            issues.push({
                code: 'ERR_HEADER_TOTAL_DEBIT_MISMATCH',
                message: 'Header total debit does not match line totals',
                details: {
                    headerTotalDebit: Money.round(Number(command.totalDebit)),
                    lineTotalDebit: totalDebit,
                },
            });
        }

        if (command.totalCredit != null && Money.round(Number(command.totalCredit) - totalCredit) !== 0) {
            issues.push({
                code: 'ERR_HEADER_TOTAL_CREDIT_MISMATCH',
                message: 'Header total credit does not match line totals',
                details: {
                    headerTotalCredit: Money.round(Number(command.totalCredit)),
                    lineTotalCredit: totalCredit,
                },
            });
        }

        return {
            isValid: issues.length === 0,
            fiscalPeriodId: periodId,
            totals: {
                lineCount: lines.length,
                totalDebit,
                totalCredit,
            },
            issues,
        };
    }
}
