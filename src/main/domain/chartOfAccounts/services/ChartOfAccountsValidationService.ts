import { DomainError } from '../../errors';
import { AccountEntity } from '../entities/AccountEntity';
import { AccountCategory } from '../enums/AccountCategory';
import { AccountSubtype } from '../enums/AccountSubtype';
import { NormalBalance } from '../enums/NormalBalance';
import { SeedAccount } from '../types/SeedAccount';

const DEFAULT_NORMAL_BALANCE_BY_CATEGORY: Record<AccountCategory, NormalBalance | null> = {
    [AccountCategory.ASSET]: NormalBalance.DEBIT,
    [AccountCategory.LIABILITY]: NormalBalance.CREDIT,
    [AccountCategory.EQUITY]: NormalBalance.CREDIT,
    [AccountCategory.REVENUE]: NormalBalance.CREDIT,
    [AccountCategory.COST_OF_SALES]: NormalBalance.DEBIT,
    [AccountCategory.EXPENSE]: NormalBalance.DEBIT,
    [AccountCategory.OTHER_INCOME]: NormalBalance.CREDIT,
    [AccountCategory.OTHER_EXPENSE]: NormalBalance.DEBIT,
    [AccountCategory.CONTROL]: null,
};

const NORMAL_BALANCE_BY_SUBTYPE: Partial<Record<AccountSubtype, NormalBalance>> = {
    [AccountSubtype.CHEQUE_RECEIVABLE]: NormalBalance.DEBIT,
    [AccountSubtype.CHEQUE_PAYABLE]: NormalBalance.CREDIT,
    [AccountSubtype.VEHICLE_EXPENSE]: NormalBalance.DEBIT,
    [AccountSubtype.ALLOWANCE_DOUBTFUL_DEBTS]: NormalBalance.CREDIT,
    [AccountSubtype.ACCUMULATED_DEPRECIATION]: NormalBalance.CREDIT,
    [AccountSubtype.ACCUMULATED_AMORTIZATION]: NormalBalance.CREDIT,
    [AccountSubtype.SALES_RETURN]: NormalBalance.DEBIT,
    [AccountSubtype.SALES_DISCOUNT]: NormalBalance.DEBIT,
    [AccountSubtype.PROMOTIONAL_DISCOUNT]: NormalBalance.DEBIT,
    [AccountSubtype.PURCHASE_RETURN]: NormalBalance.CREDIT,
    [AccountSubtype.PURCHASE_DISCOUNT]: NormalBalance.CREDIT,
};

const NON_MANUAL_SYSTEM_TAGS = new Set<string>([
    'AR_CONTROL',
    'AP_CONTROL',
    'POSTDATED_CHEQUES_UNDER_COLLECTION',
    'CHEQUES_IN_SAFE_ILS',
    'CHEQUES_IN_SAFE_JOD',
    'CHEQUES_IN_SAFE_USD',
    'CHEQUES_DEPOSITED_TO_BANK',
    'RETURNED_CUSTOMER_CHEQUES',
    'POSTDATED_CHEQUES_PAYABLE',
    'ISSUED_CHEQUES_UNDER_CLEARING',
    'INVENTORY_CONTROL',
    'INVENTORY_ADJUSTMENT_CONTROL',
    'VAT_INPUT',
    'VAT_OUTPUT',
    'VEHICLES_COST',
    'ACC_DEPR_VEHICLES',
    'ROUNDING_DIFFERENCE',
    'BRANCH_CLEARING',
    'CASH_TRANSFER_CLEARING',
    'BANK_TRANSFER_CLEARING',
    'SUSPENSE_ACCOUNT',
    'OPENING_BALANCE_EQUITY',
    'PROFIT_LOSS_CLOSING',
    'INVENTORY_CLOSING_ADJUSTMENT',
]);

const EXPECTED_PARENT_CODE_BY_SYSTEM_TAG: Record<string, string> = {
    POSTDATED_CHEQUES_UNDER_COLLECTION: '11700',
    CHEQUES_IN_SAFE_ILS: '11700',
    CHEQUES_IN_SAFE_JOD: '11700',
    CHEQUES_IN_SAFE_USD: '11700',
    CHEQUES_DEPOSITED_TO_BANK: '11700',
    RETURNED_CUSTOMER_CHEQUES: '11700',
    POSTDATED_CHEQUES_PAYABLE: '21600',
    ISSUED_CHEQUES_UNDER_CLEARING: '21600',
    VEHICLES_COST: '12300',
    ACC_DEPR_VEHICLES: '12300',
    FUEL_EXPENSE: '66200',
    VEHICLE_MAINTENANCE: '66200',
    VEHICLE_INSURANCE: '66200',
    VEHICLE_LICENSING: '66200',
    VEHICLE_TIRES: '66200',
    VEHICLE_LEASE: '66200',
    VEHICLE_CLEANING: '66200',
    VEHICLE_TRACKING: '66200',
    OTHER_VEHICLE_EXPENSES: '66200',
};

export class ChartOfAccountsValidationService {
    validateBeforeCreate(input: {
        account: AccountEntity;
        parent: AccountEntity | null;
        existingByCode: AccountEntity | null;
        existingBySystemTag: AccountEntity | null;
    }): void {
        this.assertCodeUnique(input.account, input.existingByCode);
        this.assertSystemTagUnique(input.account, input.existingBySystemTag);
        this.assertParentRules(input.account, input.parent);
        this.assertHeaderPostingDesign(input.account);
        this.assertNormalBalance(input.account.category, input.account.subtype, input.account.normalBalance);
        this.assertSystemTagManualRule(input.account.systemTag, input.account.allowManualEntry);
        this.assertSystemTagParentPlacement(input.account, input.parent);
        this.assertSubledgerControlDesign(input.account);
    }

    validateBeforeUpdate(input: {
        existing: AccountEntity;
        next: AccountEntity;
        parent: AccountEntity | null;
        existingByCode: AccountEntity | null;
        existingBySystemTag: AccountEntity | null;
        hasChildren: boolean;
    }): void {
        this.assertCodeUnique(input.next, input.existingByCode);
        this.assertSystemTagUnique(input.next, input.existingBySystemTag);
        this.assertParentRules(input.next, input.parent);
        this.assertHeaderPostingDesign(input.next);
        this.assertNormalBalance(input.next.category, input.next.subtype, input.next.normalBalance);
        this.assertSystemTagManualRule(input.next.systemTag, input.next.allowManualEntry);
        this.assertSystemTagParentPlacement(input.next, input.parent);
        this.assertSubledgerControlDesign(input.next);

        if (input.next.isPosting && input.hasChildren) {
            throw new DomainError(
                'ERR_ACCOUNT_POSTING_HAS_CHILDREN',
                'Posting account cannot have children',
                { messageKey: 'error.account.posting_has_children' },
            );
        }
    }

    validateSeedIntegrity(seed: SeedAccount[]): void {
        const byCode = new Map<string, SeedAccount>();
        const childrenCount = new Map<string, number>();

        for (const account of seed) {
            this.assertFixedWidthCode(account.code);
            this.assertHeaderPostingDesignSeed(account);
            this.assertNormalBalance(account.category, account.subtype, account.normalBalance);
            this.assertSystemTagManualRule(account.systemTag, account.allowManualEntry);
            this.assertSystemTagParentPlacementSeed(account);
            this.assertSubledgerControlDesignSeed(account);

            if (byCode.has(account.code)) {
                throw new DomainError('ERR_SEED_DUPLICATE_CODE', `Duplicate seed account code: ${account.code}`, {
                    messageKey: 'error.account.seed.duplicate_code',
                    details: { code: account.code },
                });
            }
            if (account.parentCode) {
                this.assertFixedWidthCode(account.parentCode);
                childrenCount.set(account.parentCode, (childrenCount.get(account.parentCode) || 0) + 1);
            }
            byCode.set(account.code, account);
        }

        for (const account of seed) {
            if (!account.parentCode) continue;
            const parent = byCode.get(account.parentCode);
            if (!parent) {
                throw new DomainError(
                    'ERR_SEED_PARENT_NOT_FOUND',
                    `Parent account ${account.parentCode} not found for ${account.code}`,
                    {
                        messageKey: 'error.account.seed.parent_not_found',
                        details: { code: account.code, parentCode: account.parentCode },
                    },
                );
            }
            if (parent.isPosting) {
                throw new DomainError(
                    'ERR_SEED_PARENT_IS_POSTING',
                    `Parent account ${parent.code} is posting and cannot have children`,
                    {
                        messageKey: 'error.account.seed.parent_is_posting',
                        details: { parentCode: parent.code },
                    },
                );
            }
            this.assertCategoryCompatibility(parent.category, account.category);
        }

        for (const account of seed) {
            const childCount = childrenCount.get(account.code) || 0;
            if (account.isPosting && childCount > 0) {
                throw new DomainError(
                    'ERR_SEED_POSTING_HAS_CHILDREN',
                    `Posting seed account ${account.code} cannot have children`,
                    {
                        messageKey: 'error.account.seed.posting_has_children',
                        details: { code: account.code, childCount },
                    },
                );
            }
        }
    }

    assertCanPost(account: AccountEntity): void {
        if (!account.isPosting) {
            throw new DomainError(
                'ERR_ACCOUNT_NOT_POSTABLE',
                `Account ${account.code} is header and cannot receive direct posting`,
                { messageKey: 'error.account.not_postable' },
            );
        }
        if (!account.isActive) {
            throw new DomainError(
                'ERR_ACCOUNT_INACTIVE',
                `Account ${account.code} is inactive`,
                { messageKey: 'error.account.inactive' },
            );
        }
    }

    private assertCodeUnique(account: AccountEntity, existingByCode: AccountEntity | null): void {
        if (existingByCode && existingByCode.id !== account.id) {
            throw new DomainError(
                'ERR_ACCOUNT_CODE_DUPLICATE',
                `Account code ${account.code} already exists`,
                {
                    messageKey: 'error.account.code.duplicate',
                    details: { code: account.code },
                },
            );
        }
    }

    private assertSystemTagUnique(account: AccountEntity, existingBySystemTag: AccountEntity | null): void {
        if (!account.systemTag) return;
        if (existingBySystemTag && existingBySystemTag.id !== account.id) {
            throw new DomainError(
                'ERR_ACCOUNT_SYSTEM_TAG_DUPLICATE',
                `System tag ${account.systemTag} already exists`,
                {
                    messageKey: 'error.account.system_tag.duplicate',
                    details: { systemTag: account.systemTag },
                },
            );
        }
    }

    private assertParentRules(account: AccountEntity, parent: AccountEntity | null): void {
        if (!account.parentId) return;
        if (!parent) {
            throw new DomainError('ERR_ACCOUNT_PARENT_NOT_FOUND', 'Parent account does not exist', {
                messageKey: 'error.account.parent.not_found',
            });
        }
        if (parent.isPosting) {
            throw new DomainError('ERR_ACCOUNT_PARENT_IS_POSTING', 'Posting accounts cannot have children', {
                messageKey: 'error.account.parent.is_posting',
            });
        }
        this.assertCategoryCompatibility(parent.category, account.category);
    }

    private assertCategoryCompatibility(parentCategory: AccountCategory, childCategory: AccountCategory): void {
        if (parentCategory !== childCategory) {
            throw new DomainError(
                'ERR_ACCOUNT_CATEGORY_INCOMPATIBLE',
                `Parent category ${parentCategory} is not compatible with child category ${childCategory}`,
                {
                    messageKey: 'error.account.category.incompatible',
                    details: { parentCategory, childCategory },
                },
            );
        }
    }

    private assertNormalBalance(category: AccountCategory, subtype: AccountSubtype, normalBalance: NormalBalance): void {
        const expected = NORMAL_BALANCE_BY_SUBTYPE[subtype] || DEFAULT_NORMAL_BALANCE_BY_CATEGORY[category];
        if (!expected) return;
        if (normalBalance !== expected) {
            throw new DomainError(
                'ERR_ACCOUNT_NORMAL_BALANCE_CATEGORY_MISMATCH',
                `Normal balance ${normalBalance} is inconsistent with ${category}/${subtype}`,
                {
                    messageKey: 'error.account.normal_balance.category_mismatch',
                    details: { category, subtype, expected, actual: normalBalance },
                },
            );
        }
    }

    private assertSystemTagManualRule(systemTag: string | null, allowManualEntry: boolean): void {
        if (!systemTag) return;
        if (NON_MANUAL_SYSTEM_TAGS.has(systemTag) && allowManualEntry) {
            throw new DomainError(
                'ERR_ACCOUNT_SYSTEM_TAG_MANUAL_FORBIDDEN',
                `System account ${systemTag} must not allow manual entries`,
                {
                    messageKey: 'error.account.system_tag.manual_forbidden',
                    details: { systemTag },
                },
            );
        }
    }

    private assertSystemTagParentPlacement(account: AccountEntity, parent: AccountEntity | null): void {
        if (!account.systemTag) return;
        const expectedParentCode = EXPECTED_PARENT_CODE_BY_SYSTEM_TAG[account.systemTag];
        if (!expectedParentCode) return;

        const actualParentCode = parent?.code || null;
        if (actualParentCode !== expectedParentCode) {
            throw new DomainError(
                'ERR_ACCOUNT_SYSTEM_TAG_PARENT_INVALID',
                `System tag ${account.systemTag} must be attached to parent code ${expectedParentCode}`,
                {
                    messageKey: 'error.account.system_tag.parent_invalid',
                    details: {
                        code: account.code,
                        systemTag: account.systemTag,
                        expectedParentCode,
                        actualParentCode,
                    },
                },
            );
        }
    }

    private assertSystemTagParentPlacementSeed(account: SeedAccount): void {
        if (!account.systemTag) return;
        const expectedParentCode = EXPECTED_PARENT_CODE_BY_SYSTEM_TAG[account.systemTag];
        if (!expectedParentCode) return;
        if (account.parentCode !== expectedParentCode) {
            throw new DomainError(
                'ERR_SEED_SYSTEM_TAG_PARENT_INVALID',
                `Seed system tag ${account.systemTag} must be attached to parent code ${expectedParentCode}`,
                {
                    messageKey: 'error.account.seed.system_tag.parent_invalid',
                    details: {
                        code: account.code,
                        systemTag: account.systemTag,
                        expectedParentCode,
                        actualParentCode: account.parentCode,
                    },
                },
            );
        }
    }

    private assertHeaderPostingDesign(account: AccountEntity): void {
        if (!account.isPosting && account.allowManualEntry) {
            throw new DomainError(
                'ERR_ACCOUNT_HEADER_MANUAL_FORBIDDEN',
                `Header account ${account.code} cannot allow manual entry`,
                {
                    messageKey: 'error.account.header.manual_forbidden',
                    details: { code: account.code },
                },
            );
        }

        if ((account.subtype === AccountSubtype.ROOT || account.subtype === AccountSubtype.GROUP) && account.isPosting) {
            throw new DomainError(
                'ERR_ACCOUNT_GROUP_POSTING_FORBIDDEN',
                `Group/header subtype ${account.subtype} cannot be posting`,
                {
                    messageKey: 'error.account.group.posting_forbidden',
                    details: { code: account.code, subtype: account.subtype },
                },
            );
        }
    }

    private assertHeaderPostingDesignSeed(account: SeedAccount): void {
        if (!account.isPosting && account.allowManualEntry) {
            throw new DomainError(
                'ERR_SEED_HEADER_MANUAL_FORBIDDEN',
                `Header seed account ${account.code} cannot allow manual entry`,
                {
                    messageKey: 'error.account.seed.header.manual_forbidden',
                    details: { code: account.code },
                },
            );
        }

        if ((account.subtype === AccountSubtype.ROOT || account.subtype === AccountSubtype.GROUP) && account.isPosting) {
            throw new DomainError(
                'ERR_SEED_GROUP_POSTING_FORBIDDEN',
                `Group/header seed subtype ${account.subtype} cannot be posting`,
                {
                    messageKey: 'error.account.seed.group.posting_forbidden',
                    details: { code: account.code, subtype: account.subtype },
                },
            );
        }
    }

    private assertSubledgerControlDesign(account: AccountEntity): void {
        if (account.subtype === AccountSubtype.RECEIVABLE_CONTROL) {
            this.assertArControlAccount(account);
        }
        if (account.subtype === AccountSubtype.PAYABLE_CONTROL) {
            this.assertApControlAccount(account);
        }
        if (account.systemTag === 'AR_CONTROL') {
            this.assertArControlAccount(account);
        }
        if (account.systemTag === 'AP_CONTROL') {
            this.assertApControlAccount(account);
        }
    }

    private assertSubledgerControlDesignSeed(account: SeedAccount): void {
        if (account.subtype === AccountSubtype.RECEIVABLE_CONTROL) {
            this.assertArControlSeedAccount(account);
        }
        if (account.subtype === AccountSubtype.PAYABLE_CONTROL) {
            this.assertApControlSeedAccount(account);
        }
        if (account.systemTag === 'AR_CONTROL') {
            this.assertArControlSeedAccount(account);
        }
        if (account.systemTag === 'AP_CONTROL') {
            this.assertApControlSeedAccount(account);
        }
    }

    private assertArControlAccount(account: AccountEntity): void {
        if (account.category !== AccountCategory.ASSET) {
            throw new DomainError(
                'ERR_ACCOUNT_AR_CONTROL_CATEGORY_INVALID',
                'AR control must be under ASSET category',
                {
                    messageKey: 'error.account.ar_control.category_invalid',
                    details: { code: account.code, category: account.category },
                },
            );
        }
        if (account.subtype !== AccountSubtype.RECEIVABLE_CONTROL) {
            throw new DomainError(
                'ERR_ACCOUNT_AR_CONTROL_SUBTYPE_INVALID',
                'AR control must use RECEIVABLE_CONTROL subtype',
                {
                    messageKey: 'error.account.ar_control.subtype_invalid',
                    details: { code: account.code, subtype: account.subtype },
                },
            );
        }
        if (account.systemTag !== 'AR_CONTROL') {
            throw new DomainError(
                'ERR_ACCOUNT_AR_CONTROL_TAG_REQUIRED',
                'AR control must use AR_CONTROL system tag',
                {
                    messageKey: 'error.account.ar_control.system_tag_required',
                    details: { code: account.code, systemTag: account.systemTag },
                },
            );
        }
        if (account.allowManualEntry) {
            throw new DomainError(
                'ERR_ACCOUNT_AR_CONTROL_MANUAL_FORBIDDEN',
                'AR control must not allow manual entry (subledger only)',
                {
                    messageKey: 'error.account.ar_control.manual_forbidden',
                    details: { code: account.code },
                },
            );
        }
        if (!account.isPosting) {
            throw new DomainError(
                'ERR_ACCOUNT_AR_CONTROL_POSTING_REQUIRED',
                'AR control must be posting for subledger aggregation',
                {
                    messageKey: 'error.account.ar_control.posting_required',
                    details: { code: account.code },
                },
            );
        }
    }

    private assertApControlAccount(account: AccountEntity): void {
        if (account.category !== AccountCategory.LIABILITY) {
            throw new DomainError(
                'ERR_ACCOUNT_AP_CONTROL_CATEGORY_INVALID',
                'AP control must be under LIABILITY category',
                {
                    messageKey: 'error.account.ap_control.category_invalid',
                    details: { code: account.code, category: account.category },
                },
            );
        }
        if (account.subtype !== AccountSubtype.PAYABLE_CONTROL) {
            throw new DomainError(
                'ERR_ACCOUNT_AP_CONTROL_SUBTYPE_INVALID',
                'AP control must use PAYABLE_CONTROL subtype',
                {
                    messageKey: 'error.account.ap_control.subtype_invalid',
                    details: { code: account.code, subtype: account.subtype },
                },
            );
        }
        if (account.systemTag !== 'AP_CONTROL') {
            throw new DomainError(
                'ERR_ACCOUNT_AP_CONTROL_TAG_REQUIRED',
                'AP control must use AP_CONTROL system tag',
                {
                    messageKey: 'error.account.ap_control.system_tag_required',
                    details: { code: account.code, systemTag: account.systemTag },
                },
            );
        }
        if (account.allowManualEntry) {
            throw new DomainError(
                'ERR_ACCOUNT_AP_CONTROL_MANUAL_FORBIDDEN',
                'AP control must not allow manual entry (subledger only)',
                {
                    messageKey: 'error.account.ap_control.manual_forbidden',
                    details: { code: account.code },
                },
            );
        }
        if (!account.isPosting) {
            throw new DomainError(
                'ERR_ACCOUNT_AP_CONTROL_POSTING_REQUIRED',
                'AP control must be posting for subledger aggregation',
                {
                    messageKey: 'error.account.ap_control.posting_required',
                    details: { code: account.code },
                },
            );
        }
    }

    private assertArControlSeedAccount(account: SeedAccount): void {
        if (account.category !== AccountCategory.ASSET) {
            throw new DomainError(
                'ERR_SEED_AR_CONTROL_CATEGORY_INVALID',
                'AR control seed must be under ASSET category',
                {
                    messageKey: 'error.account.seed.ar_control.category_invalid',
                    details: { code: account.code, category: account.category },
                },
            );
        }
        if (account.subtype !== AccountSubtype.RECEIVABLE_CONTROL) {
            throw new DomainError(
                'ERR_SEED_AR_CONTROL_SUBTYPE_INVALID',
                'AR control seed must use RECEIVABLE_CONTROL subtype',
                {
                    messageKey: 'error.account.seed.ar_control.subtype_invalid',
                    details: { code: account.code, subtype: account.subtype },
                },
            );
        }
        if (account.systemTag !== 'AR_CONTROL') {
            throw new DomainError(
                'ERR_SEED_AR_CONTROL_TAG_REQUIRED',
                'AR control seed must use AR_CONTROL system tag',
                {
                    messageKey: 'error.account.seed.ar_control.system_tag_required',
                    details: { code: account.code, systemTag: account.systemTag },
                },
            );
        }
        if (account.allowManualEntry) {
            throw new DomainError(
                'ERR_SEED_AR_CONTROL_MANUAL_FORBIDDEN',
                'AR control seed must not allow manual entry',
                {
                    messageKey: 'error.account.seed.ar_control.manual_forbidden',
                    details: { code: account.code },
                },
            );
        }
    }

    private assertApControlSeedAccount(account: SeedAccount): void {
        if (account.category !== AccountCategory.LIABILITY) {
            throw new DomainError(
                'ERR_SEED_AP_CONTROL_CATEGORY_INVALID',
                'AP control seed must be under LIABILITY category',
                {
                    messageKey: 'error.account.seed.ap_control.category_invalid',
                    details: { code: account.code, category: account.category },
                },
            );
        }
        if (account.subtype !== AccountSubtype.PAYABLE_CONTROL) {
            throw new DomainError(
                'ERR_SEED_AP_CONTROL_SUBTYPE_INVALID',
                'AP control seed must use PAYABLE_CONTROL subtype',
                {
                    messageKey: 'error.account.seed.ap_control.subtype_invalid',
                    details: { code: account.code, subtype: account.subtype },
                },
            );
        }
        if (account.systemTag !== 'AP_CONTROL') {
            throw new DomainError(
                'ERR_SEED_AP_CONTROL_TAG_REQUIRED',
                'AP control seed must use AP_CONTROL system tag',
                {
                    messageKey: 'error.account.seed.ap_control.system_tag_required',
                    details: { code: account.code, systemTag: account.systemTag },
                },
            );
        }
        if (account.allowManualEntry) {
            throw new DomainError(
                'ERR_SEED_AP_CONTROL_MANUAL_FORBIDDEN',
                'AP control seed must not allow manual entry',
                {
                    messageKey: 'error.account.seed.ap_control.manual_forbidden',
                    details: { code: account.code },
                },
            );
        }
    }

    private assertFixedWidthCode(code: string): void {
        if (!/^\d{5}$/.test(String(code || '').trim())) {
            throw new DomainError(
                'ERR_ACCOUNT_CODE_INVALID',
                `Account code ${code} must be fixed-width 5 digits`,
                { messageKey: 'error.account.code.fixed_width' },
            );
        }
    }
}
