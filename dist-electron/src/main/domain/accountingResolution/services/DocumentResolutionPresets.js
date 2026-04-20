"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesInvoiceRequiredRoles = getSalesInvoiceRequiredRoles;
exports.getPurchaseInvoiceRequiredRoles = getPurchaseInvoiceRequiredRoles;
exports.getInventoryAdjustmentRequiredRoles = getInventoryAdjustmentRequiredRoles;
const FinancialAccountRole_1 = require("../enums/FinancialAccountRole");
function getSalesInvoiceRequiredRoles(context) {
    const requiredRoles = [
        FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT,
        context.isService ? FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT : FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT,
    ];
    if (context.requiresTax) {
        requiredRoles.push(FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT);
    }
    if (context.requiresInventory) {
        requiredRoles.push(FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT, FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT);
    }
    const optionalRoles = [
        FinancialAccountRole_1.FinancialAccountRole.SALES_DISCOUNT_ACCOUNT,
        FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT,
    ];
    return { requiredRoles, optionalRoles };
}
function getPurchaseInvoiceRequiredRoles(context) {
    const requiredRoles = [FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT];
    if (context.requiresInventory) {
        requiredRoles.push(FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT);
    }
    else {
        requiredRoles.push(FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT);
    }
    if (context.requiresTax) {
        requiredRoles.push(FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT);
    }
    const optionalRoles = [
        FinancialAccountRole_1.FinancialAccountRole.PURCHASE_DISCOUNT_ACCOUNT,
        FinancialAccountRole_1.FinancialAccountRole.FREIGHT_IN_ACCOUNT,
        FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT,
    ];
    return { requiredRoles, optionalRoles };
}
function getInventoryAdjustmentRequiredRoles(_context) {
    return {
        requiredRoles: [
            FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT,
            FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT,
        ],
        optionalRoles: [],
    };
}
