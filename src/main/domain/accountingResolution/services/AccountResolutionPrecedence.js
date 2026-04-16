"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_ROLE_PRECEDENCE_MAP = exports.TREASURY_STYLE_PRECEDENCE = exports.CONTROL_STYLE_PRECEDENCE = exports.TAX_STYLE_PRECEDENCE = exports.PARTNER_STYLE_PRECEDENCE = exports.INVENTORY_STYLE_PRECEDENCE = void 0;
exports.getPrecedenceForRole = getPrecedenceForRole;
const FinancialAccountRole_1 = require("../enums/FinancialAccountRole");
const FinancialDefinitionOwnerType_1 = require("../enums/FinancialDefinitionOwnerType");
exports.INVENTORY_STYLE_PRECEDENCE = [
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.ITEM,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.ITEM_GROUP,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.WAREHOUSE,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY,
];
exports.PARTNER_STYLE_PRECEDENCE = [
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.PARTNER,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY,
];
exports.TAX_STYLE_PRECEDENCE = [
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.TAX_PROFILE,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.PARTNER,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY,
];
exports.CONTROL_STYLE_PRECEDENCE = [
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.BRANCH,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY,
];
exports.TREASURY_STYLE_PRECEDENCE = [
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.PARTNER,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.WAREHOUSE,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY,
];
exports.ACCOUNT_ROLE_PRECEDENCE_MAP = {
    [FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT]: exports.PARTNER_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT]: exports.PARTNER_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.RAW_MATERIAL_INVENTORY_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.WIP_INVENTORY_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.FINISHED_GOODS_INVENTORY_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.MERCHANDISE_INVENTORY_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.PURCHASE_RETURN_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.SALES_RETURN_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.SALES_DISCOUNT_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.PURCHASE_DISCOUNT_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.FREIGHT_IN_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.PRICE_DIFFERENCE_ACCOUNT]: exports.INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT]: exports.TAX_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT]: exports.TAX_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.WITHHOLDING_TAX_ACCOUNT]: exports.TAX_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT]: exports.CONTROL_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.SUSPENSE_ACCOUNT]: exports.CONTROL_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.CASH_ACCOUNT]: exports.TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.BANK_ACCOUNT]: exports.TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.CHEQUE_IN_SAFE_ACCOUNT]: exports.TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.CHEQUES_DEPOSITED_ACCOUNT]: exports.TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.RETURNED_CHEQUE_ACCOUNT]: exports.TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.ISSUED_CHEQUE_ACCOUNT]: exports.TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole_1.FinancialAccountRole.BANK_CLEARING_ACCOUNT]: exports.TREASURY_STYLE_PRECEDENCE,
};
function getPrecedenceForRole(role) {
    return exports.ACCOUNT_ROLE_PRECEDENCE_MAP[role] || exports.INVENTORY_STYLE_PRECEDENCE;
}
