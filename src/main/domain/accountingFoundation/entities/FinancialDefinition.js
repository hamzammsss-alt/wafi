"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialDefinition = void 0;
const errors_1 = require("../../errors");
const AccountMappingKey_1 = require("../enums/AccountMappingKey");
const AccountingErrorCode_1 = require("../enums/AccountingErrorCode");
const FinancialDefinitionScopeType_1 = require("../enums/FinancialDefinitionScopeType");
class FinancialDefinition {
    constructor(props) {
        this.props = props;
    }
    static create(props) {
        FinancialDefinition.validate(props);
        return new FinancialDefinition(props);
    }
    static rehydrate(props) {
        FinancialDefinition.validate(props);
        return new FinancialDefinition(props);
    }
    static validate(props) {
        if (!props.companyId) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Company id is required', {
                messageKey: 'error.financial_definition.company_required',
            });
        }
        if (!Object.values(FinancialDefinitionScopeType_1.FinancialDefinitionScopeType).includes(props.scopeType)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Scope type is invalid', {
                messageKey: 'error.financial_definition.scope.invalid',
            });
        }
        if (!String(props.scopeId || '').trim()) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Scope id is required', {
                messageKey: 'error.financial_definition.scope_id.required',
            });
        }
        if (!Object.values(AccountMappingKey_1.AccountMappingKey).includes(props.mappingKey)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Mapping key is invalid', {
                messageKey: 'error.financial_definition.mapping_key.invalid',
            });
        }
        if (!String(props.accountId || '').trim()) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Account id is required', {
                messageKey: 'error.financial_definition.account_id.required',
            });
        }
        if (!Number.isFinite(props.priority) || props.priority < 0) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Priority must be >= 0', {
                messageKey: 'error.financial_definition.priority.invalid',
            });
        }
        if (props.scopeType === FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.BRANCH && !String(props.branchId || '').trim()) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Branch mapping requires branch id', {
                messageKey: 'error.financial_definition.branch_required',
            });
        }
        if (props.validFrom && props.validTo && props.validFrom > props.validTo) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH, 'Valid date range is invalid', { messageKey: 'error.financial_definition.valid_range.invalid' });
        }
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
    get branchId() {
        return this.props.branchId;
    }
    get scopeType() {
        return this.props.scopeType;
    }
    get scopeId() {
        return this.props.scopeId;
    }
    get mappingKey() {
        return this.props.mappingKey;
    }
    get accountId() {
        return this.props.accountId;
    }
    get priority() {
        return this.props.priority;
    }
    get isActive() {
        return this.props.isActive;
    }
    get validFrom() {
        return this.props.validFrom;
    }
    get validTo() {
        return this.props.validTo;
    }
    get updatedAt() {
        return this.props.updatedAt;
    }
    get documentType() {
        return this.props.documentType;
    }
    get lineType() {
        return this.props.lineType;
    }
    get taxProfileId() {
        return this.props.taxProfileId;
    }
}
exports.FinancialDefinition = FinancialDefinition;
