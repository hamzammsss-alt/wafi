import { DomainError } from '../../errors';
import { AccountMappingKey } from '../enums/AccountMappingKey';
import { AccountingErrorCode } from '../enums/AccountingErrorCode';
import { FinancialDefinitionScopeType } from '../enums/FinancialDefinitionScopeType';

export interface FinancialDefinitionProps {
    id: string;
    companyId: string;
    branchId: string | null;
    scopeType: FinancialDefinitionScopeType;
    scopeId: string;
    mappingKey: AccountMappingKey;
    accountId: string;
    priority: number;
    isActive: boolean;
    validFrom: string | null;
    validTo: string | null;
    documentType: string | null;
    lineType: string | null;
    taxProfileId: string | null;
    updatedAt: string | null;
}

export class FinancialDefinition {
    private constructor(private readonly props: FinancialDefinitionProps) { }

    static create(props: FinancialDefinitionProps): FinancialDefinition {
        FinancialDefinition.validate(props);
        return new FinancialDefinition(props);
    }

    static rehydrate(props: FinancialDefinitionProps): FinancialDefinition {
        FinancialDefinition.validate(props);
        return new FinancialDefinition(props);
    }

    private static validate(props: FinancialDefinitionProps): void {
        if (!props.companyId) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Company id is required', {
                messageKey: 'error.financial_definition.company_required',
            });
        }
        if (!Object.values(FinancialDefinitionScopeType).includes(props.scopeType)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Scope type is invalid', {
                messageKey: 'error.financial_definition.scope.invalid',
            });
        }
        if (!String(props.scopeId || '').trim()) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Scope id is required', {
                messageKey: 'error.financial_definition.scope_id.required',
            });
        }
        if (!Object.values(AccountMappingKey).includes(props.mappingKey)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Mapping key is invalid', {
                messageKey: 'error.financial_definition.mapping_key.invalid',
            });
        }
        if (!String(props.accountId || '').trim()) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Account id is required', {
                messageKey: 'error.financial_definition.account_id.required',
            });
        }
        if (!Number.isFinite(props.priority) || props.priority < 0) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Priority must be >= 0', {
                messageKey: 'error.financial_definition.priority.invalid',
            });
        }
        if (props.scopeType === FinancialDefinitionScopeType.BRANCH && !String(props.branchId || '').trim()) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Branch mapping requires branch id', {
                messageKey: 'error.financial_definition.branch_required',
            });
        }
        if (props.validFrom && props.validTo && props.validFrom > props.validTo) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH,
                'Valid date range is invalid',
                { messageKey: 'error.financial_definition.valid_range.invalid' },
            );
        }
    }

    toJSON(): FinancialDefinitionProps {
        return { ...this.props };
    }

    get id(): string {
        return this.props.id;
    }

    get companyId(): string {
        return this.props.companyId;
    }

    get branchId(): string | null {
        return this.props.branchId;
    }

    get scopeType(): FinancialDefinitionScopeType {
        return this.props.scopeType;
    }

    get scopeId(): string {
        return this.props.scopeId;
    }

    get mappingKey(): AccountMappingKey {
        return this.props.mappingKey;
    }

    get accountId(): string {
        return this.props.accountId;
    }

    get priority(): number {
        return this.props.priority;
    }

    get isActive(): boolean {
        return this.props.isActive;
    }

    get validFrom(): string | null {
        return this.props.validFrom;
    }

    get validTo(): string | null {
        return this.props.validTo;
    }

    get updatedAt(): string | null {
        return this.props.updatedAt;
    }

    get documentType(): string | null {
        return this.props.documentType;
    }

    get lineType(): string | null {
        return this.props.lineType;
    }

    get taxProfileId(): string | null {
        return this.props.taxProfileId;
    }
}
