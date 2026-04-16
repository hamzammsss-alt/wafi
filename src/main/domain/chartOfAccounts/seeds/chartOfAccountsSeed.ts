import { AccountCategory } from '../enums/AccountCategory';
import { AccountSubtype } from '../enums/AccountSubtype';
import { NormalBalance } from '../enums/NormalBalance';
import { SeedAccount } from '../types/SeedAccount';

const D = NormalBalance.DEBIT;
const C = NormalBalance.CREDIT;

const header = (
    code: string,
    name: string,
    category: AccountCategory,
    parentCode: string | null,
    subtype: AccountSubtype = AccountSubtype.GROUP,
): SeedAccount => ({
    code,
    name,
    category,
    subtype,
    parentCode,
    isPosting: false,
    normalBalance:
        category === AccountCategory.LIABILITY ||
        category === AccountCategory.EQUITY ||
        category === AccountCategory.REVENUE ||
        category === AccountCategory.OTHER_INCOME
            ? C
            : D,
    systemTag: null,
    allowManualEntry: false,
    isActive: true,
});

const posting = (
    code: string,
    name: string,
    category: AccountCategory,
    subtype: AccountSubtype,
    parentCode: string,
    normalBalance: NormalBalance,
    options?: {
        systemTag?: string;
        allowManualEntry?: boolean;
        isActive?: boolean;
    },
): SeedAccount => ({
    code,
    name,
    category,
    subtype,
    parentCode,
    isPosting: true,
    normalBalance,
    systemTag: options?.systemTag ?? null,
    allowManualEntry: options?.allowManualEntry ?? true,
    isActive: options?.isActive ?? true,
});

export const chartOfAccountsSeed: SeedAccount[] = [
    header('10000', 'Assets', AccountCategory.ASSET, null, AccountSubtype.ROOT),
    header('11000', 'Current Assets', AccountCategory.ASSET, '10000'),
    header('11100', 'Cash and Cash Equivalents', AccountCategory.ASSET, '11000'),
    posting('11101', 'Main Cash', AccountCategory.ASSET, AccountSubtype.CASH, '11100', D),
    posting('11102', 'POS Cash', AccountCategory.ASSET, AccountSubtype.CASH, '11100', D),
    posting('11103', 'Petty Cash', AccountCategory.ASSET, AccountSubtype.CASH, '11100', D),
    posting('11104', 'Bank ILS', AccountCategory.ASSET, AccountSubtype.BANK, '11100', D),
    posting('11105', 'Bank USD', AccountCategory.ASSET, AccountSubtype.BANK, '11100', D),
    posting('11106', 'Bank JOD', AccountCategory.ASSET, AccountSubtype.BANK, '11100', D),
    posting('11107', 'Undeposited Funds', AccountCategory.ASSET, AccountSubtype.UNDEPOSITED_FUNDS, '11100', D),

    header('11200', 'Trade Receivables', AccountCategory.ASSET, '11000'),
    posting('11201', 'Accounts Receivable Control', AccountCategory.ASSET, AccountSubtype.RECEIVABLE_CONTROL, '11200', D, {
        systemTag: 'AR_CONTROL',
        allowManualEntry: false,
    }),
    posting('11202', 'Notes Receivable', AccountCategory.ASSET, AccountSubtype.RECEIVABLE_NOTE, '11200', D),
    posting('11203', 'Returned Cheques', AccountCategory.ASSET, AccountSubtype.RECEIVABLE_RETURNED_CHEQUE, '11200', D),
    posting('11204', 'Employee Receivables', AccountCategory.ASSET, AccountSubtype.RECEIVABLE_EMPLOYEE, '11200', D),
    posting('11205', 'Other Receivables', AccountCategory.ASSET, AccountSubtype.RECEIVABLE_OTHER, '11200', D),
    posting('11206', 'Allowance for Doubtful Debts', AccountCategory.ASSET, AccountSubtype.ALLOWANCE_DOUBTFUL_DEBTS, '11200', C, {
        allowManualEntry: false,
    }),

    header('11300', 'Inventory', AccountCategory.ASSET, '11000'),
    posting('11301', 'Raw Materials Inventory', AccountCategory.ASSET, AccountSubtype.INVENTORY_RAW_MATERIAL, '11300', D),
    posting('11302', 'Work in Progress Inventory', AccountCategory.ASSET, AccountSubtype.INVENTORY_WIP, '11300', D),
    posting('11303', 'Finished Goods Inventory', AccountCategory.ASSET, AccountSubtype.INVENTORY_FINISHED_GOOD, '11300', D),
    posting('11304', 'Merchandise Inventory', AccountCategory.ASSET, AccountSubtype.INVENTORY_MERCHANDISE, '11300', D, {
        systemTag: 'INVENTORY_CONTROL',
        allowManualEntry: false,
    }),
    posting('11305', 'Goods in Transit', AccountCategory.ASSET, AccountSubtype.INVENTORY_GOODS_IN_TRANSIT, '11300', D),
    posting('11306', 'Inventory Adjustment Control', AccountCategory.ASSET, AccountSubtype.INVENTORY_ADJUSTMENT_CONTROL, '11300', D, {
        systemTag: 'INVENTORY_ADJUSTMENT_CONTROL',
        allowManualEntry: false,
    }),

    header('11400', 'Tax Recoverables', AccountCategory.ASSET, '11000'),
    posting('11401', 'VAT Input Recoverable', AccountCategory.ASSET, AccountSubtype.TAX_INPUT_VAT, '11400', D, {
        systemTag: 'VAT_INPUT',
        allowManualEntry: false,
    }),
    posting('11402', 'Advance Tax Payments', AccountCategory.ASSET, AccountSubtype.TAX_ADVANCE, '11400', D),

    header('11500', 'Prepaid Expenses', AccountCategory.ASSET, '11000'),
    posting('11501', 'Prepaid Rent', AccountCategory.ASSET, AccountSubtype.PREPAID_RENT, '11500', D),
    posting('11502', 'Prepaid Insurance', AccountCategory.ASSET, AccountSubtype.PREPAID_INSURANCE, '11500', D),
    posting('11503', 'Prepaid Contracts', AccountCategory.ASSET, AccountSubtype.PREPAID_CONTRACT, '11500', D),

    header('11600', 'Clearing Accounts', AccountCategory.ASSET, '11000'),
    posting('11601', 'Branch Clearing', AccountCategory.ASSET, AccountSubtype.CLEARING_BRANCH, '11600', D, {
        systemTag: 'BRANCH_CLEARING',
        allowManualEntry: false,
    }),
    posting('11602', 'Cash Transfer Clearing', AccountCategory.ASSET, AccountSubtype.CLEARING_CASH_TRANSFER, '11600', D, {
        systemTag: 'CASH_TRANSFER_CLEARING',
        allowManualEntry: false,
    }),
    posting('11603', 'Bank Transfer Clearing', AccountCategory.ASSET, AccountSubtype.CLEARING_BANK_TRANSFER, '11600', D, {
        systemTag: 'BANK_TRANSFER_CLEARING',
        allowManualEntry: false,
    }),
    header('11700', 'Cheques and Notes Receivable', AccountCategory.ASSET, '11000'),
    posting(
        '11701',
        'Postdated Cheques Under Collection',
        AccountCategory.ASSET,
        AccountSubtype.CHEQUE_RECEIVABLE,
        '11700',
        D,
        {
            systemTag: 'POSTDATED_CHEQUES_UNDER_COLLECTION',
            allowManualEntry: false,
        },
    ),
    posting('11702', 'Cheques in Safe - ILS', AccountCategory.ASSET, AccountSubtype.CHEQUE_RECEIVABLE, '11700', D, {
        systemTag: 'CHEQUES_IN_SAFE_ILS',
        allowManualEntry: false,
    }),
    posting('11703', 'Cheques in Safe - JOD', AccountCategory.ASSET, AccountSubtype.CHEQUE_RECEIVABLE, '11700', D, {
        systemTag: 'CHEQUES_IN_SAFE_JOD',
        allowManualEntry: false,
    }),
    posting('11704', 'Cheques in Safe - USD', AccountCategory.ASSET, AccountSubtype.CHEQUE_RECEIVABLE, '11700', D, {
        systemTag: 'CHEQUES_IN_SAFE_USD',
        allowManualEntry: false,
    }),
    posting('11705', 'Cheques Deposited to Bank', AccountCategory.ASSET, AccountSubtype.CHEQUE_RECEIVABLE, '11700', D, {
        systemTag: 'CHEQUES_DEPOSITED_TO_BANK',
        allowManualEntry: false,
    }),
    posting('11706', 'Returned Customer Cheques', AccountCategory.ASSET, AccountSubtype.CHEQUE_RECEIVABLE, '11700', D, {
        systemTag: 'RETURNED_CUSTOMER_CHEQUES',
        allowManualEntry: false,
    }),

    header('12000', 'Non-Current Assets', AccountCategory.ASSET, '10000'),
    header('12100', 'Property and Buildings', AccountCategory.ASSET, '12000'),
    posting('12101', 'Land', AccountCategory.ASSET, AccountSubtype.FIXED_ASSET_LAND, '12100', D),
    posting('12102', 'Buildings at Cost', AccountCategory.ASSET, AccountSubtype.FIXED_ASSET_BUILDING, '12100', D),
    posting('12103', 'Accumulated Depreciation Buildings', AccountCategory.ASSET, AccountSubtype.ACCUMULATED_DEPRECIATION, '12100', C, {
        allowManualEntry: false,
    }),

    header('12200', 'Plant and Equipment', AccountCategory.ASSET, '12000'),
    posting('12201', 'Machinery at Cost', AccountCategory.ASSET, AccountSubtype.FIXED_ASSET_MACHINERY, '12200', D),
    posting('12202', 'Accumulated Depreciation Machinery', AccountCategory.ASSET, AccountSubtype.ACCUMULATED_DEPRECIATION, '12200', C, {
        allowManualEntry: false,
    }),

    header('12300', 'Vehicles', AccountCategory.ASSET, '12000'),
    posting('12301', 'Vehicles at Cost', AccountCategory.ASSET, AccountSubtype.FIXED_ASSET_VEHICLE, '12300', D, {
        systemTag: 'VEHICLES_COST',
        allowManualEntry: false,
    }),
    posting('12302', 'Accumulated Depreciation - Vehicles', AccountCategory.ASSET, AccountSubtype.ACCUMULATED_DEPRECIATION, '12300', C, {
        systemTag: 'ACC_DEPR_VEHICLES',
        allowManualEntry: false,
    }),

    header('12400', 'Furniture and Fixtures', AccountCategory.ASSET, '12000'),
    posting('12401', 'Furniture at Cost', AccountCategory.ASSET, AccountSubtype.FIXED_ASSET_FURNITURE, '12400', D),
    posting('12402', 'Accumulated Depreciation Furniture', AccountCategory.ASSET, AccountSubtype.ACCUMULATED_DEPRECIATION, '12400', C, {
        allowManualEntry: false,
    }),

    header('12500', 'Computers and Software', AccountCategory.ASSET, '12000'),
    posting('12501', 'Computers at Cost', AccountCategory.ASSET, AccountSubtype.FIXED_ASSET_COMPUTER, '12500', D),
    posting('12502', 'Software Licenses', AccountCategory.ASSET, AccountSubtype.FIXED_ASSET_SOFTWARE, '12500', D),
    posting('12503', 'Accumulated Depreciation Computers', AccountCategory.ASSET, AccountSubtype.ACCUMULATED_DEPRECIATION, '12500', C, {
        allowManualEntry: false,
    }),
    posting('12504', 'Accumulated Amortization Software', AccountCategory.ASSET, AccountSubtype.ACCUMULATED_AMORTIZATION, '12500', C, {
        allowManualEntry: false,
    }),

    header('20000', 'Liabilities', AccountCategory.LIABILITY, null, AccountSubtype.ROOT),
    header('21000', 'Current Liabilities', AccountCategory.LIABILITY, '20000'),
    header('21100', 'Trade Payables', AccountCategory.LIABILITY, '21000'),
    posting('21101', 'Accounts Payable Control', AccountCategory.LIABILITY, AccountSubtype.PAYABLE_CONTROL, '21100', C, {
        systemTag: 'AP_CONTROL',
        allowManualEntry: false,
    }),
    posting('21102', 'Notes Payable', AccountCategory.LIABILITY, AccountSubtype.PAYABLE_NOTE, '21100', C),
    posting('21103', 'Other Trade Payables', AccountCategory.LIABILITY, AccountSubtype.PAYABLE_OTHER, '21100', C),

    header('21200', 'Accruals', AccountCategory.LIABILITY, '21000'),
    posting('21201', 'Salaries Payable', AccountCategory.LIABILITY, AccountSubtype.ACCRUED_EXPENSE, '21200', C),
    posting('21202', 'Rent Payable', AccountCategory.LIABILITY, AccountSubtype.ACCRUED_EXPENSE, '21200', C),
    posting('21203', 'Utilities Payable', AccountCategory.LIABILITY, AccountSubtype.ACCRUED_EXPENSE, '21200', C),
    posting('21204', 'Accrued Expenses', AccountCategory.LIABILITY, AccountSubtype.ACCRUED_EXPENSE, '21200', C),

    header('21300', 'Taxes Payable', AccountCategory.LIABILITY, '21000'),
    posting('21301', 'VAT Output Payable', AccountCategory.LIABILITY, AccountSubtype.TAX_OUTPUT_VAT, '21300', C, {
        systemTag: 'VAT_OUTPUT',
        allowManualEntry: false,
    }),
    posting('21302', 'Withholding Tax Payable', AccountCategory.LIABILITY, AccountSubtype.TAX_WITHHOLDING, '21300', C),
    posting('21303', 'Income Tax Payable', AccountCategory.LIABILITY, AccountSubtype.TAX_INCOME, '21300', C),

    header('21400', 'Customer Advances', AccountCategory.LIABILITY, '21000'),
    posting('21401', 'Advances from Customers', AccountCategory.LIABILITY, AccountSubtype.CUSTOMER_ADVANCE, '21400', C),
    posting('21402', 'Unearned Revenue', AccountCategory.LIABILITY, AccountSubtype.UNEARNED_REVENUE, '21400', C),
    posting('21403', 'Gift Card Liability', AccountCategory.LIABILITY, AccountSubtype.GIFT_CARD_LIABILITY, '21400', C),

    header('21500', 'Other Current Liabilities', AccountCategory.LIABILITY, '21000'),
    posting('21501', 'Short-Term Loans', AccountCategory.LIABILITY, AccountSubtype.LOAN_SHORT_TERM, '21500', C),
    posting('21502', 'Credit Card Settlement Payable', AccountCategory.LIABILITY, AccountSubtype.CREDIT_CARD_SETTLEMENT, '21500', C),
    header('21600', 'Issued and Postdated Cheques', AccountCategory.LIABILITY, '21000'),
    posting(
        '21601',
        'Postdated Cheques Payable',
        AccountCategory.LIABILITY,
        AccountSubtype.CHEQUE_PAYABLE,
        '21600',
        C,
        {
            systemTag: 'POSTDATED_CHEQUES_PAYABLE',
            allowManualEntry: false,
        },
    ),
    posting(
        '21602',
        'Issued Cheques Under Clearing',
        AccountCategory.LIABILITY,
        AccountSubtype.CHEQUE_PAYABLE,
        '21600',
        C,
        {
            systemTag: 'ISSUED_CHEQUES_UNDER_CLEARING',
            allowManualEntry: false,
        },
    ),

    header('22000', 'Non-Current Liabilities', AccountCategory.LIABILITY, '20000'),
    header('22100', 'Long-Term Loans', AccountCategory.LIABILITY, '22000'),
    posting('22101', 'Bank Loan Long Term', AccountCategory.LIABILITY, AccountSubtype.LOAN_LONG_TERM, '22100', C),
    posting('22102', 'Lease Liability Long Term', AccountCategory.LIABILITY, AccountSubtype.LEASE_LONG_TERM, '22100', C),

    header('30000', 'Equity', AccountCategory.EQUITY, null, AccountSubtype.ROOT),
    header('31000', 'Paid-in Capital', AccountCategory.EQUITY, '30000'),
    posting('31101', 'Owner Capital', AccountCategory.EQUITY, AccountSubtype.OWNER_CAPITAL, '31000', C),
    posting('31102', 'Partner Capital', AccountCategory.EQUITY, AccountSubtype.PARTNER_CAPITAL, '31000', C),
    posting('31103', 'Additional Paid-in Capital', AccountCategory.EQUITY, AccountSubtype.ADDITIONAL_PAID_IN_CAPITAL, '31000', C),

    header('32000', 'Reserves', AccountCategory.EQUITY, '30000'),
    posting('32101', 'Statutory Reserve', AccountCategory.EQUITY, AccountSubtype.STATUTORY_RESERVE, '32000', C),
    posting('32102', 'General Reserve', AccountCategory.EQUITY, AccountSubtype.GENERAL_RESERVE, '32000', C),

    header('33000', 'Retained Earnings', AccountCategory.EQUITY, '30000'),
    posting('33101', 'Retained Earnings Prior Years', AccountCategory.EQUITY, AccountSubtype.RETAINED_EARNINGS, '33000', C),
    posting('33102', 'Current Year Earnings', AccountCategory.EQUITY, AccountSubtype.RETAINED_EARNINGS, '33000', C),

    header('34000', 'Drawings', AccountCategory.EQUITY, '30000'),
    posting('34101', 'Owner Drawings', AccountCategory.EQUITY, AccountSubtype.OWNER_DRAWINGS, '34000', D),
    posting('34102', 'Partner Drawings', AccountCategory.EQUITY, AccountSubtype.PARTNER_DRAWINGS, '34000', D),

    header('40000', 'Revenue', AccountCategory.REVENUE, null, AccountSubtype.ROOT),
    header('41000', 'Sales Revenue', AccountCategory.REVENUE, '40000'),
    posting('41101', 'Retail Sales', AccountCategory.REVENUE, AccountSubtype.SALES_REVENUE, '41000', C),
    posting('41102', 'Wholesale Sales', AccountCategory.REVENUE, AccountSubtype.SALES_REVENUE, '41000', C),
    posting('41103', 'E-Commerce Sales', AccountCategory.REVENUE, AccountSubtype.SALES_REVENUE, '41000', C),
    posting('41104', 'Export Sales', AccountCategory.REVENUE, AccountSubtype.SALES_REVENUE, '41000', C),
    posting('41105', 'Service Revenue', AccountCategory.REVENUE, AccountSubtype.SERVICE_REVENUE, '41000', C),
    posting('41106', 'Delivery Revenue', AccountCategory.REVENUE, AccountSubtype.DELIVERY_REVENUE, '41000', C),

    header('42000', 'Sales Deductions', AccountCategory.REVENUE, '40000'),
    posting('42101', 'Sales Returns', AccountCategory.REVENUE, AccountSubtype.SALES_RETURN, '42000', D),
    posting('42102', 'Sales Discounts Allowed', AccountCategory.REVENUE, AccountSubtype.SALES_DISCOUNT, '42000', D),
    posting('42103', 'Promotional Discounts', AccountCategory.REVENUE, AccountSubtype.PROMOTIONAL_DISCOUNT, '42000', D),

    header('50000', 'Cost of Sales', AccountCategory.COST_OF_SALES, null, AccountSubtype.ROOT),
    header('51000', 'Cost of Goods Sold', AccountCategory.COST_OF_SALES, '50000'),
    posting('51101', 'COGS Retail', AccountCategory.COST_OF_SALES, AccountSubtype.COGS, '51000', D),
    posting('51102', 'COGS Wholesale', AccountCategory.COST_OF_SALES, AccountSubtype.COGS, '51000', D),
    posting('51103', 'COGS E-Commerce', AccountCategory.COST_OF_SALES, AccountSubtype.COGS, '51000', D),
    posting('51104', 'COGS Export', AccountCategory.COST_OF_SALES, AccountSubtype.COGS, '51000', D),

    header('52000', 'Purchase Adjustments', AccountCategory.COST_OF_SALES, '50000'),
    posting('52101', 'Purchase Returns', AccountCategory.COST_OF_SALES, AccountSubtype.PURCHASE_RETURN, '52000', C),
    posting('52102', 'Purchase Discounts Earned', AccountCategory.COST_OF_SALES, AccountSubtype.PURCHASE_DISCOUNT, '52000', C),
    posting('52103', 'Freight In', AccountCategory.COST_OF_SALES, AccountSubtype.FREIGHT_IN, '52000', D),
    posting('52104', 'Customs and Import Charges', AccountCategory.COST_OF_SALES, AccountSubtype.CUSTOMS_IMPORT, '52000', D),

    header('60000', 'Operating Expenses', AccountCategory.EXPENSE, null, AccountSubtype.ROOT),
    header('61000', 'Payroll Expenses', AccountCategory.EXPENSE, '60000'),
    posting('61101', 'Basic Salaries', AccountCategory.EXPENSE, AccountSubtype.PAYROLL_EXPENSE, '61000', D),
    posting('61102', 'Wages', AccountCategory.EXPENSE, AccountSubtype.PAYROLL_EXPENSE, '61000', D),
    posting('61103', 'Bonuses', AccountCategory.EXPENSE, AccountSubtype.PAYROLL_EXPENSE, '61000', D),
    posting('61104', 'Employer Social Security', AccountCategory.EXPENSE, AccountSubtype.PAYROLL_EXPENSE, '61000', D),

    header('62000', 'Occupancy Expenses', AccountCategory.EXPENSE, '60000'),
    posting('62101', 'Rent Expense', AccountCategory.EXPENSE, AccountSubtype.OCCUPANCY_EXPENSE, '62000', D),
    posting('62102', 'Electricity Expense', AccountCategory.EXPENSE, AccountSubtype.OCCUPANCY_EXPENSE, '62000', D),
    posting('62103', 'Water Expense', AccountCategory.EXPENSE, AccountSubtype.OCCUPANCY_EXPENSE, '62000', D),
    posting('62104', 'Municipality Fees', AccountCategory.EXPENSE, AccountSubtype.OCCUPANCY_EXPENSE, '62000', D),

    header('63000', 'Selling and Marketing', AccountCategory.EXPENSE, '60000'),
    posting('63101', 'Advertising Expense', AccountCategory.EXPENSE, AccountSubtype.SELLING_MARKETING_EXPENSE, '63000', D),
    posting('63102', 'Social Media Ads', AccountCategory.EXPENSE, AccountSubtype.SELLING_MARKETING_EXPENSE, '63000', D),
    posting('63103', 'Sales Commissions', AccountCategory.EXPENSE, AccountSubtype.SELLING_MARKETING_EXPENSE, '63000', D),
    posting('63104', 'Packaging Expense', AccountCategory.EXPENSE, AccountSubtype.SELLING_MARKETING_EXPENSE, '63000', D),
    posting('63105', 'Delivery Expense', AccountCategory.EXPENSE, AccountSubtype.SELLING_MARKETING_EXPENSE, '63000', D),

    header('64000', 'Administrative Expenses', AccountCategory.EXPENSE, '60000'),
    posting('64101', 'Office Supplies', AccountCategory.EXPENSE, AccountSubtype.ADMINISTRATIVE_EXPENSE, '64000', D),
    posting('64102', 'Printing and Stationery', AccountCategory.EXPENSE, AccountSubtype.ADMINISTRATIVE_EXPENSE, '64000', D),
    posting('64103', 'Legal and Professional Fees', AccountCategory.EXPENSE, AccountSubtype.ADMINISTRATIVE_EXPENSE, '64000', D),
    posting('64104', 'Bank Charges', AccountCategory.EXPENSE, AccountSubtype.ADMINISTRATIVE_EXPENSE, '64000', D),
    posting('64105', 'Licenses and Permits', AccountCategory.EXPENSE, AccountSubtype.ADMINISTRATIVE_EXPENSE, '64000', D),
    posting('64106', 'Travel Expense', AccountCategory.EXPENSE, AccountSubtype.ADMINISTRATIVE_EXPENSE, '64000', D),
    posting('64107', 'SaaS Subscriptions', AccountCategory.EXPENSE, AccountSubtype.ADMINISTRATIVE_EXPENSE, '64000', D),

    header('65000', 'IT and Communications', AccountCategory.EXPENSE, '60000'),
    posting('65101', 'Telephone Expense', AccountCategory.EXPENSE, AccountSubtype.IT_COMMUNICATION_EXPENSE, '65000', D),
    posting('65102', 'Internet Expense', AccountCategory.EXPENSE, AccountSubtype.IT_COMMUNICATION_EXPENSE, '65000', D),
    posting('65103', 'Hosting Expense', AccountCategory.EXPENSE, AccountSubtype.IT_COMMUNICATION_EXPENSE, '65000', D),
    posting('65104', 'Software Subscriptions', AccountCategory.EXPENSE, AccountSubtype.IT_COMMUNICATION_EXPENSE, '65000', D),

    header('66000', 'Maintenance and Repairs', AccountCategory.EXPENSE, '60000'),
    posting('66101', 'Equipment Maintenance', AccountCategory.EXPENSE, AccountSubtype.MAINTENANCE_REPAIR_EXPENSE, '66000', D),
    posting('66102', 'Vehicle Maintenance', AccountCategory.EXPENSE, AccountSubtype.MAINTENANCE_REPAIR_EXPENSE, '66000', D),
    posting('66103', 'Building Maintenance', AccountCategory.EXPENSE, AccountSubtype.MAINTENANCE_REPAIR_EXPENSE, '66000', D),
    header('66200', 'Vehicle Operating Expenses', AccountCategory.EXPENSE, '66000'),
    posting('66201', 'Fuel Expense', AccountCategory.EXPENSE, AccountSubtype.VEHICLE_EXPENSE, '66200', D, {
        systemTag: 'FUEL_EXPENSE',
    }),
    posting('66202', 'Vehicle Maintenance and Repairs', AccountCategory.EXPENSE, AccountSubtype.VEHICLE_EXPENSE, '66200', D, {
        systemTag: 'VEHICLE_MAINTENANCE',
    }),
    posting('66203', 'Vehicle Insurance', AccountCategory.EXPENSE, AccountSubtype.VEHICLE_EXPENSE, '66200', D, {
        systemTag: 'VEHICLE_INSURANCE',
    }),
    posting(
        '66204',
        'Vehicle Licensing and Registration',
        AccountCategory.EXPENSE,
        AccountSubtype.VEHICLE_EXPENSE,
        '66200',
        D,
        {
            systemTag: 'VEHICLE_LICENSING',
        },
    ),
    posting('66205', 'Tires and Consumables', AccountCategory.EXPENSE, AccountSubtype.VEHICLE_EXPENSE, '66200', D, {
        systemTag: 'VEHICLE_TIRES',
    }),
    posting('66206', 'Vehicle Lease or Rental Expense', AccountCategory.EXPENSE, AccountSubtype.VEHICLE_EXPENSE, '66200', D, {
        systemTag: 'VEHICLE_LEASE',
    }),
    posting('66207', 'Vehicle Cleaning and Washing', AccountCategory.EXPENSE, AccountSubtype.VEHICLE_EXPENSE, '66200', D, {
        systemTag: 'VEHICLE_CLEANING',
    }),
    posting(
        '66208',
        'Vehicle Tracking and Fleet Systems',
        AccountCategory.EXPENSE,
        AccountSubtype.VEHICLE_EXPENSE,
        '66200',
        D,
        {
            systemTag: 'VEHICLE_TRACKING',
        },
    ),
    posting('66209', 'Other Vehicle Expenses', AccountCategory.EXPENSE, AccountSubtype.VEHICLE_EXPENSE, '66200', D, {
        systemTag: 'OTHER_VEHICLE_EXPENSES',
    }),

    header('67000', 'Depreciation and Amortization', AccountCategory.EXPENSE, '60000'),
    posting('67101', 'Depreciation Buildings', AccountCategory.EXPENSE, AccountSubtype.DEPRECIATION_AMORTIZATION_EXPENSE, '67000', D),
    posting('67102', 'Depreciation Machinery', AccountCategory.EXPENSE, AccountSubtype.DEPRECIATION_AMORTIZATION_EXPENSE, '67000', D),
    posting('67103', 'Depreciation Vehicles', AccountCategory.EXPENSE, AccountSubtype.DEPRECIATION_AMORTIZATION_EXPENSE, '67000', D),
    posting('67104', 'Depreciation Furniture', AccountCategory.EXPENSE, AccountSubtype.DEPRECIATION_AMORTIZATION_EXPENSE, '67000', D),
    posting('67105', 'Depreciation Computers', AccountCategory.EXPENSE, AccountSubtype.DEPRECIATION_AMORTIZATION_EXPENSE, '67000', D),
    posting('67106', 'Amortization Software', AccountCategory.EXPENSE, AccountSubtype.DEPRECIATION_AMORTIZATION_EXPENSE, '67000', D),

    header('68000', 'Credit Losses', AccountCategory.EXPENSE, '60000'),
    posting('68101', 'Bad Debt Expense', AccountCategory.EXPENSE, AccountSubtype.CREDIT_LOSS_EXPENSE, '68000', D),
    posting('68102', 'Doubtful Debt Provision Expense', AccountCategory.EXPENSE, AccountSubtype.CREDIT_LOSS_EXPENSE, '68000', D),

    header('70000', 'Other Income', AccountCategory.OTHER_INCOME, null, AccountSubtype.ROOT),
    posting('71101', 'Gain on Asset Disposal', AccountCategory.OTHER_INCOME, AccountSubtype.GAIN_ASSET_DISPOSAL, '70000', C),
    posting('71102', 'Foreign Exchange Gain', AccountCategory.OTHER_INCOME, AccountSubtype.FX_GAIN, '70000', C),
    posting('71103', 'Miscellaneous Income', AccountCategory.OTHER_INCOME, AccountSubtype.MISC_INCOME, '70000', C),

    header('80000', 'Other Expenses', AccountCategory.OTHER_EXPENSE, null, AccountSubtype.ROOT),
    posting('81101', 'Loss on Asset Disposal', AccountCategory.OTHER_EXPENSE, AccountSubtype.LOSS_ASSET_DISPOSAL, '80000', D),
    posting('81102', 'Foreign Exchange Loss', AccountCategory.OTHER_EXPENSE, AccountSubtype.FX_LOSS, '80000', D),
    posting('81103', 'Penalties and Fines', AccountCategory.OTHER_EXPENSE, AccountSubtype.PENALTIES_FINES, '80000', D),
    posting('81104', 'Miscellaneous Losses', AccountCategory.OTHER_EXPENSE, AccountSubtype.MISC_EXPENSE, '80000', D),

    header('90000', 'Control and Closing', AccountCategory.CONTROL, null, AccountSubtype.ROOT),
    posting('91101', 'Suspense Account', AccountCategory.CONTROL, AccountSubtype.SUSPENSE, '90000', D, {
        systemTag: 'SUSPENSE_ACCOUNT',
        allowManualEntry: false,
    }),
    posting('91102', 'Opening Balance Equity', AccountCategory.CONTROL, AccountSubtype.OPENING_BALANCE_EQUITY, '90000', C, {
        systemTag: 'OPENING_BALANCE_EQUITY',
        allowManualEntry: false,
    }),
    posting('91103', 'Rounding Difference Account', AccountCategory.CONTROL, AccountSubtype.ROUNDING_DIFFERENCE, '90000', D, {
        systemTag: 'ROUNDING_DIFFERENCE',
        allowManualEntry: false,
    }),
    posting('92101', 'Profit and Loss Closing', AccountCategory.CONTROL, AccountSubtype.CLOSING_PROFIT_LOSS, '90000', C, {
        systemTag: 'PROFIT_LOSS_CLOSING',
        allowManualEntry: false,
    }),
    posting(
        '92102',
        'Inventory Closing Adjustment',
        AccountCategory.CONTROL,
        AccountSubtype.CLOSING_INVENTORY_ADJUSTMENT,
        '90000',
        D,
        {
            systemTag: 'INVENTORY_CLOSING_ADJUSTMENT',
            allowManualEntry: false,
        },
    ),
];
