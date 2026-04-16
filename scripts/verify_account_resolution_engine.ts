import assert from 'node:assert/strict';
import { FinancialDefinitionEntity } from '../src/main/domain/accountingResolution/entities/FinancialDefinitionEntity';
import { FinancialAccountRole } from '../src/main/domain/accountingResolution/enums/FinancialAccountRole';
import { FinancialDefinitionOwnerType } from '../src/main/domain/accountingResolution/enums/FinancialDefinitionOwnerType';
import {
    AccountResolutionEngine,
    ResolutionAccountState,
} from '../src/main/domain/accountingResolution/services/AccountResolutionEngine';
import { AccountResolutionContext } from '../src/main/domain/accountingResolution/types/AccountResolutionContext';
import { ResolutionNeed } from '../src/main/domain/accountingResolution/types/ResolutionNeed';

const COMPANY_ID = 'COMP_01';
const BRANCH_ID = 'BR_01';

type AccountSeed = {
    id: string;
    code: string;
    name: string;
    isPosting?: boolean;
    isActive?: boolean;
};

function createAccountState(seed: AccountSeed): ResolutionAccountState {
    return {
        id: seed.id,
        code: seed.code,
        name: seed.name,
        isPosting: seed.isPosting !== false,
        isActive: seed.isActive !== false,
        systemTag: null,
        allowManualEntry: true,
    };
}

function buildAccountsMap(seeds: AccountSeed[]): Map<string, ResolutionAccountState> {
    return new Map(seeds.map((seed) => [seed.id, createAccountState(seed)]));
}

function createDefinition(input: {
    id: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    accountRole: FinancialAccountRole;
    accountId: string;
    updatedAt?: string;
}): FinancialDefinitionEntity {
    const now = input.updatedAt || '2026-03-01T00:00:00.000Z';
    return FinancialDefinitionEntity.create({
        id: input.id,
        companyId: COMPANY_ID,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        accountRole: input.accountRole,
        accountId: input.accountId,
        notes: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    });
}

function buildContext(overrides: Partial<AccountResolutionContext> = {}): AccountResolutionContext {
    return {
        companyId: COMPANY_ID,
        branchId: BRANCH_ID,
        documentType: 'SALES_INVOICE',
        documentId: null,
        lineType: 'ITEM',
        itemId: null,
        itemGroupId: null,
        warehouseId: null,
        partnerId: null,
        taxProfileId: null,
        isService: false,
        inventoryMode: null,
        requiresInventory: false,
        requiresTax: false,
        currencyCode: 'ILS',
        direction: null,
        ...overrides,
    };
}

function buildNeeds(requiredRoles: FinancialAccountRole[], optionalRoles: FinancialAccountRole[] = []): ResolutionNeed {
    return {
        requiredRoles,
        optionalRoles,
    };
}

async function runCase(name: string, task: () => void | Promise<void>): Promise<void> {
    await task();
    console.log(`[PASS] ${name}`);
}

async function main(): Promise<void> {
    const engine = new AccountResolutionEngine();

    await runCase('1) deterministic result does not depend on input definition order', () => {
        const accounts = buildAccountsMap([
            { id: 'A_AR_COMP', code: '11201', name: 'AR Company' },
            { id: 'A_AR_PARTNER', code: '11211', name: 'AR Partner' },
            { id: 'A_REV_ITEM', code: '41102', name: 'Revenue Item' },
            { id: 'A_REV_COMP', code: '41101', name: 'Revenue Company' },
        ]);

        const defs = [
            createDefinition({
                id: 'D_REV_COMP',
                ownerType: FinancialDefinitionOwnerType.COMPANY,
                ownerId: 'DEFAULT',
                accountRole: FinancialAccountRole.REVENUE_ACCOUNT,
                accountId: 'A_REV_COMP',
                updatedAt: '2026-03-01T10:00:00.000Z',
            }),
            createDefinition({
                id: 'D_AR_COMP',
                ownerType: FinancialDefinitionOwnerType.COMPANY,
                ownerId: 'DEFAULT',
                accountRole: FinancialAccountRole.RECEIVABLE_ACCOUNT,
                accountId: 'A_AR_COMP',
                updatedAt: '2026-03-01T10:00:00.000Z',
            }),
            createDefinition({
                id: 'D_AR_PARTNER',
                ownerType: FinancialDefinitionOwnerType.PARTNER,
                ownerId: 'BP_1',
                accountRole: FinancialAccountRole.RECEIVABLE_ACCOUNT,
                accountId: 'A_AR_PARTNER',
                updatedAt: '2026-03-02T10:00:00.000Z',
            }),
            createDefinition({
                id: 'D_REV_ITEM',
                ownerType: FinancialDefinitionOwnerType.ITEM,
                ownerId: 'ITM_1',
                accountRole: FinancialAccountRole.REVENUE_ACCOUNT,
                accountId: 'A_REV_ITEM',
                updatedAt: '2026-03-03T10:00:00.000Z',
            }),
        ];

        const context = buildContext({
            partnerId: 'BP_1',
            itemId: 'ITM_1',
        });
        const needs = buildNeeds([
            FinancialAccountRole.RECEIVABLE_ACCOUNT,
            FinancialAccountRole.REVENUE_ACCOUNT,
        ]);

        const resultA = engine.resolve({ context, needs, definitions: defs, accountsById: accounts });
        const resultB = engine.resolve({ context, needs, definitions: [...defs].reverse(), accountsById: accounts });

        assert.equal(resultA.success, true);
        assert.equal(resultB.success, true);
        assert.deepEqual(resultA.resolvedAccounts, resultB.resolvedAccounts);
        assert.equal(resultA.deterministicSignature, resultB.deterministicSignature);
    });

    await runCase('2) trace is explainable with ranked candidates and selected source', () => {
        const accounts = buildAccountsMap([
            { id: 'A_REV_ITEM_NEW', code: '41120', name: 'Revenue Item New' },
            { id: 'A_REV_ITEM_OLD', code: '41121', name: 'Revenue Item Old' },
            { id: 'A_REV_COMP', code: '41101', name: 'Revenue Company' },
        ]);

        const definitions = [
            createDefinition({
                id: 'D_ITEM_OLD',
                ownerType: FinancialDefinitionOwnerType.ITEM,
                ownerId: 'ITM_TRACE',
                accountRole: FinancialAccountRole.REVENUE_ACCOUNT,
                accountId: 'A_REV_ITEM_OLD',
                updatedAt: '2026-03-01T08:00:00.000Z',
            }),
            createDefinition({
                id: 'D_ITEM_NEW',
                ownerType: FinancialDefinitionOwnerType.ITEM,
                ownerId: 'ITM_TRACE',
                accountRole: FinancialAccountRole.REVENUE_ACCOUNT,
                accountId: 'A_REV_ITEM_NEW',
                updatedAt: '2026-03-05T08:00:00.000Z',
            }),
            createDefinition({
                id: 'D_COMP',
                ownerType: FinancialDefinitionOwnerType.COMPANY,
                ownerId: 'DEFAULT',
                accountRole: FinancialAccountRole.REVENUE_ACCOUNT,
                accountId: 'A_REV_COMP',
                updatedAt: '2026-03-01T00:00:00.000Z',
            }),
        ];

        const result = engine.resolve({
            context: buildContext({ itemId: 'ITM_TRACE' }),
            needs: buildNeeds([FinancialAccountRole.REVENUE_ACCOUNT]),
            definitions,
            accountsById: accounts,
        });

        assert.equal(result.success, true);
        const revenueTrace = result.trace.find((item) => item.role === FinancialAccountRole.REVENUE_ACCOUNT);
        assert.ok(revenueTrace);
        const itemStep = revenueTrace?.steps.find(
            (step) =>
                step.ownerType === FinancialDefinitionOwnerType.ITEM &&
                step.ownerId === 'ITM_TRACE',
        );
        assert.ok(itemStep);
        assert.ok((itemStep?.evaluatedCandidates?.length || 0) >= 2);
        assert.equal(itemStep?.selectedCandidate?.definitionId, 'D_ITEM_NEW');
        assert.equal(revenueTrace?.resolvedFrom?.definitionId, 'D_ITEM_NEW');
    });

    await runCase('3) ambiguity is explicit for conflicting definitions at same business rank', () => {
        const accounts = buildAccountsMap([
            { id: 'A_REV_1', code: '41131', name: 'Revenue 1' },
            { id: 'A_REV_2', code: '41132', name: 'Revenue 2' },
        ]);

        const definitions = [
            createDefinition({
                id: 'D_AMB_1',
                ownerType: FinancialDefinitionOwnerType.ITEM,
                ownerId: 'ITM_AMB',
                accountRole: FinancialAccountRole.REVENUE_ACCOUNT,
                accountId: 'A_REV_1',
                updatedAt: '2026-03-02T00:00:00.000Z',
            }),
            createDefinition({
                id: 'D_AMB_2',
                ownerType: FinancialDefinitionOwnerType.ITEM,
                ownerId: 'ITM_AMB',
                accountRole: FinancialAccountRole.REVENUE_ACCOUNT,
                accountId: 'A_REV_2',
                updatedAt: '2026-03-02T00:00:00.000Z',
            }),
        ];

        const result = engine.resolve({
            context: buildContext({ itemId: 'ITM_AMB' }),
            needs: buildNeeds([FinancialAccountRole.REVENUE_ACCOUNT]),
            definitions,
            accountsById: accounts,
        });

        assert.equal(result.success, false);
        assert.equal(result.missingRoles.length, 1);
        assert.equal(result.missingRoles[0].reason, 'AMBIGUOUS_DEFINITION');
        assert.deepEqual(
            (result.missingRoles[0].diagnostics?.conflictingDefinitionIds || []).sort(),
            ['D_AMB_2'].sort(),
        );
    });

    await runCase('4) fallback precedence is deterministic (ITEM_GROUP over COMPANY)', () => {
        const accounts = buildAccountsMap([
            { id: 'A_COGS_GROUP', code: '51101', name: 'COGS Group' },
            { id: 'A_COGS_COMP', code: '51109', name: 'COGS Company' },
        ]);

        const definitions = [
            createDefinition({
                id: 'D_COMP',
                ownerType: FinancialDefinitionOwnerType.COMPANY,
                ownerId: 'DEFAULT',
                accountRole: FinancialAccountRole.COGS_ACCOUNT,
                accountId: 'A_COGS_COMP',
            }),
            createDefinition({
                id: 'D_GROUP',
                ownerType: FinancialDefinitionOwnerType.ITEM_GROUP,
                ownerId: 'GRP_1',
                accountRole: FinancialAccountRole.COGS_ACCOUNT,
                accountId: 'A_COGS_GROUP',
            }),
        ];

        const result = engine.resolve({
            context: buildContext({ itemId: 'ITM_UNKNOWN', itemGroupId: 'GRP_1' }),
            needs: buildNeeds([FinancialAccountRole.COGS_ACCOUNT]),
            definitions,
            accountsById: accounts,
        });

        assert.equal(result.success, true);
        assert.equal(
            result.resolvedAccounts[FinancialAccountRole.COGS_ACCOUNT]?.accountId,
            'A_COGS_GROUP',
        );
    });

    await runCase('5) inactive selected account fails clearly with trace and diagnostics', () => {
        const accounts = buildAccountsMap([
            { id: 'A_AR_INACTIVE', code: '11299', name: 'AR Inactive', isActive: false },
        ]);

        const definitions = [
            createDefinition({
                id: 'D_AR_COMP',
                ownerType: FinancialDefinitionOwnerType.COMPANY,
                ownerId: 'DEFAULT',
                accountRole: FinancialAccountRole.RECEIVABLE_ACCOUNT,
                accountId: 'A_AR_INACTIVE',
            }),
        ];

        const result = engine.resolve({
            context: buildContext({ partnerId: 'BP_NO_DEF' }),
            needs: buildNeeds([FinancialAccountRole.RECEIVABLE_ACCOUNT]),
            definitions,
            accountsById: accounts,
        });

        assert.equal(result.success, false);
        assert.equal(result.missingRoles[0]?.reason, 'ACCOUNT_INACTIVE');
        const roleTrace = result.trace.find(
            (item) => item.role === FinancialAccountRole.RECEIVABLE_ACCOUNT,
        );
        assert.ok(roleTrace?.steps.some((step) => step.reason === 'ACCOUNT_INACTIVE'));
    });
}

main()
    .then(() => {
        console.log('[DONE] Account Resolution Engine verification passed');
    })
    .catch((error: unknown) => {
        console.error('[FAIL] Account Resolution Engine verification failed');
        console.error(error);
        process.exit(1);
    });
