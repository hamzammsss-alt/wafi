"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialDefinitionEntity = void 0;
const errors_1 = require("../../errors");
const FinancialAccountRole_1 = require("../enums/FinancialAccountRole");
const FinancialDefinitionOwnerType_1 = require("../enums/FinancialDefinitionOwnerType");
class FinancialDefinitionEntity {
    constructor(props) {
        this.props = props;
    }
    static create(input) {
        const now = new Date().toISOString();
        return new FinancialDefinitionEntity(FinancialDefinitionEntity.normalize({
            ...input,
            notes: input.notes ?? null,
            isActive: input.isActive !== false,
            createdAt: input.createdAt || now,
            updatedAt: input.updatedAt || now,
        }));
    }
    static rehydrate(props) {
        return new FinancialDefinitionEntity(FinancialDefinitionEntity.normalize(props));
    }
    static normalize(input) {
        const id = String(input.id || '').trim();
        if (!id) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ID_REQUIRED', 'Financial definition id is required', {
                messageKey: 'error.financial_definition.id.required',
            });
        }
        const companyId = String(input.companyId || '').trim();
        if (!companyId) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.financial_definition.company.required',
            });
        }
        if (!Object.values(FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType).includes(input.ownerType)) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_OWNER_TYPE_INVALID', 'Owner type is invalid', {
                messageKey: 'error.financial_definition.owner_type.invalid',
            });
        }
        const ownerId = String(input.ownerId || '').trim();
        if (!ownerId) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_OWNER_ID_REQUIRED', 'Owner id is required', {
                messageKey: 'error.financial_definition.owner_id.required',
            });
        }
        if (!Object.values(FinancialAccountRole_1.FinancialAccountRole).includes(input.accountRole)) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ACCOUNT_ROLE_INVALID', 'Account role is invalid', {
                messageKey: 'error.financial_definition.account_role.invalid',
            });
        }
        const accountId = String(input.accountId || '').trim();
        if (!accountId) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ACCOUNT_REQUIRED', 'Account id is required', {
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
    toJSON() {
        return { ...this.props };
    }
    get id() {
        return this.props.id;
    }
    get companyId() {
        return this.props.companyId;
    }
    get ownerType() {
        return this.props.ownerType;
    }
    get ownerId() {
        return this.props.ownerId;
    }
    get accountRole() {
        return this.props.accountRole;
    }
    get accountId() {
        return this.props.accountId;
    }
    get notes() {
        return this.props.notes;
    }
    get isActive() {
        return this.props.isActive;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get updatedAt() {
        return this.props.updatedAt;
    }
}
exports.FinancialDefinitionEntity = FinancialDefinitionEntity;
