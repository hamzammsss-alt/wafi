import { FinancialAccountRole } from '../enums/FinancialAccountRole';
import { FinancialDefinitionOwnerType } from '../enums/FinancialDefinitionOwnerType';

export const INVENTORY_STYLE_PRECEDENCE: readonly FinancialDefinitionOwnerType[] = [
    FinancialDefinitionOwnerType.ITEM,
    FinancialDefinitionOwnerType.ITEM_GROUP,
    FinancialDefinitionOwnerType.WAREHOUSE,
    FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType.COMPANY,
];

export const PARTNER_STYLE_PRECEDENCE: readonly FinancialDefinitionOwnerType[] = [
    FinancialDefinitionOwnerType.PARTNER,
    FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType.COMPANY,
];

export const TAX_STYLE_PRECEDENCE: readonly FinancialDefinitionOwnerType[] = [
    FinancialDefinitionOwnerType.TAX_PROFILE,
    FinancialDefinitionOwnerType.PARTNER,
    FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType.COMPANY,
];

export const CONTROL_STYLE_PRECEDENCE: readonly FinancialDefinitionOwnerType[] = [
    FinancialDefinitionOwnerType.BRANCH,
    FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType.COMPANY,
];

export const TREASURY_STYLE_PRECEDENCE: readonly FinancialDefinitionOwnerType[] = [
    FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT,
    FinancialDefinitionOwnerType.PARTNER,
    FinancialDefinitionOwnerType.WAREHOUSE,
    FinancialDefinitionOwnerType.COMPANY,
];

export const ACCOUNT_ROLE_PRECEDENCE_MAP: Record<FinancialAccountRole, readonly FinancialDefinitionOwnerType[]> = {
    [FinancialAccountRole.RECEIVABLE_ACCOUNT]: PARTNER_STYLE_PRECEDENCE,
    [FinancialAccountRole.PAYABLE_ACCOUNT]: PARTNER_STYLE_PRECEDENCE,

    [FinancialAccountRole.REVENUE_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.SERVICE_REVENUE_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.EXPENSE_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.INVENTORY_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.RAW_MATERIAL_INVENTORY_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.WIP_INVENTORY_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.FINISHED_GOODS_INVENTORY_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.MERCHANDISE_INVENTORY_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.COGS_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.PURCHASE_RETURN_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.SALES_RETURN_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.SALES_DISCOUNT_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.PURCHASE_DISCOUNT_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.FREIGHT_IN_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,
    [FinancialAccountRole.PRICE_DIFFERENCE_ACCOUNT]: INVENTORY_STYLE_PRECEDENCE,

    [FinancialAccountRole.VAT_INPUT_ACCOUNT]: TAX_STYLE_PRECEDENCE,
    [FinancialAccountRole.VAT_OUTPUT_ACCOUNT]: TAX_STYLE_PRECEDENCE,
    [FinancialAccountRole.WITHHOLDING_TAX_ACCOUNT]: TAX_STYLE_PRECEDENCE,

    [FinancialAccountRole.ROUNDING_ACCOUNT]: CONTROL_STYLE_PRECEDENCE,
    [FinancialAccountRole.SUSPENSE_ACCOUNT]: CONTROL_STYLE_PRECEDENCE,
    [FinancialAccountRole.CASH_ACCOUNT]: TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole.BANK_ACCOUNT]: TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole.CHEQUE_IN_SAFE_ACCOUNT]: TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole.CHEQUES_DEPOSITED_ACCOUNT]: TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole.RETURNED_CHEQUE_ACCOUNT]: TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole.ISSUED_CHEQUE_ACCOUNT]: TREASURY_STYLE_PRECEDENCE,
    [FinancialAccountRole.BANK_CLEARING_ACCOUNT]: TREASURY_STYLE_PRECEDENCE,
};

export function getPrecedenceForRole(role: FinancialAccountRole): readonly FinancialDefinitionOwnerType[] {
    return ACCOUNT_ROLE_PRECEDENCE_MAP[role] || INVENTORY_STYLE_PRECEDENCE;
}
