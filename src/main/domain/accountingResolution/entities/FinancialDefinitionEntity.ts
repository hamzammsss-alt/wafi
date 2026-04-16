import { DomainError } from '../../errors';
import { FinancialAccountRole } from '../enums/FinancialAccountRole';
import { FinancialDefinitionOwnerType } from '../enums/FinancialDefinitionOwnerType';

export interface FinancialDefinitionEntityProps {
    id: string;
    companyId: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    accountRole: FinancialAccountRole;
    accountId: string;
    notes: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFinancialDefinitionEntityProps {
    id: string;
    companyId: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    accountRole: FinancialAccountRole;
    accountId: string;
    notes?: string | null;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export class FinancialDefinitionEntity {
    private constructor(private readonly props: FinancialDefinitionEntityProps) {}

    static create(input: CreateFinancialDefinitionEntityProps): FinancialDefinitionEntity {
        const now = new Date().toISOString();
        return new FinancialDefinitionEntity(
            FinancialDefinitionEntity.normalize({
                ...input,
                notes: input.notes ?? null,
                isActive: input.isActive !== false,
                createdAt: input.createdAt || now,
                updatedAt: input.updatedAt || now,
            }),
        );
    }

    static rehydrate(props: FinancialDefinitionEntityProps): FinancialDefinitionEntity {
        return new FinancialDefinitionEntity(FinancialDefinitionEntity.normalize(props));
    }

    private static normalize(input: FinancialDefinitionEntityProps): FinancialDefinitionEntityProps {
        const id = String(input.id || '').trim();
        if (!id) {
            throw new DomainError('ERR_FIN_DEFINITION_ID_REQUIRED', 'Financial definition id is required', {
                messageKey: 'error.financial_definition.id.required',
            });
        }

        const companyId = String(input.companyId || '').trim();
        if (!companyId) {
            throw new DomainError('ERR_FIN_DEFINITION_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.financial_definition.company.required',
            });
        }

        if (!Object.values(FinancialDefinitionOwnerType).includes(input.ownerType)) {
            throw new DomainError('ERR_FIN_DEFINITION_OWNER_TYPE_INVALID', 'Owner type is invalid', {
                messageKey: 'error.financial_definition.owner_type.invalid',
            });
        }

        const ownerId = String(input.ownerId || '').trim();
        if (!ownerId) {
            throw new DomainError('ERR_FIN_DEFINITION_OWNER_ID_REQUIRED', 'Owner id is required', {
                messageKey: 'error.financial_definition.owner_id.required',
            });
        }

        if (!Object.values(FinancialAccountRole).includes(input.accountRole)) {
            throw new DomainError('ERR_FIN_DEFINITION_ACCOUNT_ROLE_INVALID', 'Account role is invalid', {
                messageKey: 'error.financial_definition.account_role.invalid',
            });
        }

        const accountId = String(input.accountId || '').trim();
        if (!accountId) {
            throw new DomainError('ERR_FIN_DEFINITION_ACCOUNT_REQUIRED', 'Account id is required', {
                messageKey: 'error.financial_definition.account.required',
            });
        }

        const notes = input.notes ? String(input.notes).trim() : null;

        return {
            id,
            companyId,
            ownerType: input.ownerType,
            ownerId,
            accountRole: input.accountRole,
            accountId,
            notes,
            isActive: Boolean(input.isActive),
            createdAt: String(input.createdAt || ''),
            updatedAt: String(input.updatedAt || ''),
        };
    }

    toJSON(): FinancialDefinitionEntityProps {
        return { ...this.props };
    }

    get id(): string {
        return this.props.id;
    }

    get companyId(): string {
        return this.props.companyId;
    }

    get ownerType(): FinancialDefinitionOwnerType {
        return this.props.ownerType;
    }

    get ownerId(): string {
        return this.props.ownerId;
    }

    get accountRole(): FinancialAccountRole {
        return this.props.accountRole;
    }

    get accountId(): string {
        return this.props.accountId;
    }

    get notes(): string | null {
        return this.props.notes;
    }

    get isActive(): boolean {
        return this.props.isActive;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }
}
