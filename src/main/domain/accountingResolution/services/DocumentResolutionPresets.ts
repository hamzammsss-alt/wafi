import { FinancialAccountRole } from '../enums/FinancialAccountRole';
import { AccountResolutionContext } from '../types/AccountResolutionContext';
import { ResolutionNeed } from '../types/ResolutionNeed';

export function getSalesInvoiceRequiredRoles(context: AccountResolutionContext): ResolutionNeed {
    const requiredRoles: FinancialAccountRole[] = [
        FinancialAccountRole.RECEIVABLE_ACCOUNT,
        context.isService ? FinancialAccountRole.SERVICE_REVENUE_ACCOUNT : FinancialAccountRole.REVENUE_ACCOUNT,
    ];

    if (context.requiresTax) {
        requiredRoles.push(FinancialAccountRole.VAT_OUTPUT_ACCOUNT);
    }

    if (context.requiresInventory) {
        requiredRoles.push(FinancialAccountRole.COGS_ACCOUNT, FinancialAccountRole.INVENTORY_ACCOUNT);
    }

    const optionalRoles: FinancialAccountRole[] = [
        FinancialAccountRole.SALES_DISCOUNT_ACCOUNT,
        FinancialAccountRole.ROUNDING_ACCOUNT,
    ];

    return { requiredRoles, optionalRoles };
}

export function getPurchaseInvoiceRequiredRoles(context: AccountResolutionContext): ResolutionNeed {
    const requiredRoles: FinancialAccountRole[] = [FinancialAccountRole.PAYABLE_ACCOUNT];

    if (context.requiresInventory) {
        requiredRoles.push(FinancialAccountRole.INVENTORY_ACCOUNT);
    } else {
        requiredRoles.push(FinancialAccountRole.EXPENSE_ACCOUNT);
    }

    if (context.requiresTax) {
        requiredRoles.push(FinancialAccountRole.VAT_INPUT_ACCOUNT);
    }

    const optionalRoles: FinancialAccountRole[] = [
        FinancialAccountRole.PURCHASE_DISCOUNT_ACCOUNT,
        FinancialAccountRole.FREIGHT_IN_ACCOUNT,
        FinancialAccountRole.ROUNDING_ACCOUNT,
    ];

    return { requiredRoles, optionalRoles };
}

export function getInventoryAdjustmentRequiredRoles(_context: AccountResolutionContext): ResolutionNeed {
    return {
        requiredRoles: [
            FinancialAccountRole.INVENTORY_ACCOUNT,
            FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT,
        ],
        optionalRoles: [],
    };
}
