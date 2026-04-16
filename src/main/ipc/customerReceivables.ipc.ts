import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { CustomerReceivablesUseCases } from '../application/useCases/CustomerReceivablesUseCases';
import {
    CancelCustomerFollowUpInput,
    CreateCustomerFollowUpInput,
    CreateCustomerInput,
    CustomerAgingQueryInput,
    CustomerStatementQueryInput,
    CustomerTimelineQueryInput,
    EvaluateCustomerCreditInput,
    ListCustomersInput,
    MarkCustomerFollowUpDoneInput,
    PlaceCustomerHoldInput,
    ReleaseCustomerHoldInput,
    SaveCustomerAddressInput,
    SaveCustomerContactInput,
    SaveCustomerCreditProfileInput,
    SetCustomerActiveInput,
    UpdateCustomerFollowUpInput,
    UpdateCustomerInput,
} from '../domain/crm/types/CustomerReceivablesTypes';

const LEGACY_PERMISSIONS = {
    READ: ['customer.view', 'receivables.view', 'collections.view', 'system.settings'],
    WRITE: ['customer.manage', 'receivables.manage', 'collections.manage', 'system.settings'],
    CONTROL: ['customer.credit_control', 'receivables.manage', 'system.settings'],
} as const;

export function registerCustomerReceivablesIPC(useCases: CustomerReceivablesUseCases): void {
    ipcMain.handle(
        'customer.create',
        ipcWrap(
            withGuards(
                { eventName: 'customer.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateCustomerInput) =>
                    useCases.customerCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateCustomerInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.update',
        ipcWrap(
            withGuards(
                { eventName: 'customer.update', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: UpdateCustomerInput) =>
                    useCases.customerUpdate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateCustomerInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.getById',
        ipcWrap(
            withGuards(
                { eventName: 'customer.getById', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, customerId: string) =>
                    useCases.customerGetById(ctx.companyId, String(customerId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'customer.list',
        ipcWrap(
            withGuards(
                { eventName: 'customer.list', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: ListCustomersInput) =>
                    useCases.customerList(ctx.companyId, payload || {}),
            ),
        ),
    );

    ipcMain.handle(
        'customer.setActive',
        ipcWrap(
            withGuards(
                { eventName: 'customer.setActive', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: SetCustomerActiveInput) =>
                    useCases.customerSetActive(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as SetCustomerActiveInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.getContacts',
        ipcWrap(
            withGuards(
                { eventName: 'customer.getContacts', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, customerId: string) =>
                    useCases.customerGetContacts(ctx.companyId, String(customerId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'customer.saveContact',
        ipcWrap(
            withGuards(
                { eventName: 'customer.saveContact', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: SaveCustomerContactInput) =>
                    useCases.customerSaveContact(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as SaveCustomerContactInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.getAddresses',
        ipcWrap(
            withGuards(
                { eventName: 'customer.getAddresses', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, customerId: string) =>
                    useCases.customerGetAddresses(ctx.companyId, String(customerId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'customer.saveAddress',
        ipcWrap(
            withGuards(
                { eventName: 'customer.saveAddress', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: SaveCustomerAddressInput) =>
                    useCases.customerSaveAddress(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as SaveCustomerAddressInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.getCreditProfile',
        ipcWrap(
            withGuards(
                { eventName: 'customer.getCreditProfile', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, customerId: string) =>
                    useCases.customerGetCreditProfile(ctx.companyId, String(customerId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'customer.saveCreditProfile',
        ipcWrap(
            withGuards(
                { eventName: 'customer.saveCreditProfile', legacyPermissions: [...LEGACY_PERMISSIONS.CONTROL, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: SaveCustomerCreditProfileInput) =>
                    useCases.customerSaveCreditProfile(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as SaveCustomerCreditProfileInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.evaluateCredit',
        ipcWrap(
            withGuards(
                { eventName: 'customer.evaluateCredit', legacyPermissions: [...LEGACY_PERMISSIONS.CONTROL, ...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: EvaluateCustomerCreditInput) =>
                    useCases.customerEvaluateCredit(ctx.companyId, ctx.branchId, payload || ({} as EvaluateCustomerCreditInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.placeHold',
        ipcWrap(
            withGuards(
                { eventName: 'customer.placeHold', legacyPermissions: [...LEGACY_PERMISSIONS.CONTROL] },
                async (ctx, _event, payload: PlaceCustomerHoldInput) =>
                    useCases.customerPlaceHold(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as PlaceCustomerHoldInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.releaseHold',
        ipcWrap(
            withGuards(
                { eventName: 'customer.releaseHold', legacyPermissions: [...LEGACY_PERMISSIONS.CONTROL] },
                async (ctx, _event, payload: ReleaseCustomerHoldInput) =>
                    useCases.customerReleaseHold(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ReleaseCustomerHoldInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.getExposure',
        ipcWrap(
            withGuards(
                { eventName: 'customer.getExposure', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: EvaluateCustomerCreditInput) =>
                    useCases.customerGetExposure(ctx.companyId, ctx.branchId, payload || ({} as EvaluateCustomerCreditInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.getStatement',
        ipcWrap(
            withGuards(
                { eventName: 'customer.getStatement', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: CustomerStatementQueryInput) =>
                    useCases.customerGetStatement(ctx.companyId, ctx.branchId, payload || ({} as CustomerStatementQueryInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.getAging',
        ipcWrap(
            withGuards(
                { eventName: 'customer.getAging', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: CustomerAgingQueryInput) =>
                    useCases.customerGetAging(ctx.companyId, ctx.branchId, payload || ({} as CustomerAgingQueryInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customer.getTimeline',
        ipcWrap(
            withGuards(
                { eventName: 'customer.getTimeline', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: CustomerTimelineQueryInput) =>
                    useCases.customerGetTimeline(ctx.companyId, payload || ({} as CustomerTimelineQueryInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customerFollowUp.create',
        ipcWrap(
            withGuards(
                { eventName: 'customerFollowUp.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateCustomerFollowUpInput) =>
                    useCases.customerFollowUpCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateCustomerFollowUpInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customerFollowUp.update',
        ipcWrap(
            withGuards(
                { eventName: 'customerFollowUp.update', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: UpdateCustomerFollowUpInput) =>
                    useCases.customerFollowUpUpdate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateCustomerFollowUpInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customerFollowUp.getByCustomer',
        ipcWrap(
            withGuards(
                { eventName: 'customerFollowUp.getByCustomer', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, customerId: string, includeClosed?: boolean) =>
                    useCases.customerFollowUpGetByCustomer(ctx.companyId, String(customerId || '').trim(), includeClosed),
            ),
        ),
    );

    ipcMain.handle(
        'customerFollowUp.markDone',
        ipcWrap(
            withGuards(
                { eventName: 'customerFollowUp.markDone', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: MarkCustomerFollowUpDoneInput) =>
                    useCases.customerFollowUpMarkDone(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as MarkCustomerFollowUpDoneInput)),
            ),
        ),
    );

    ipcMain.handle(
        'customerFollowUp.cancel',
        ipcWrap(
            withGuards(
                { eventName: 'customerFollowUp.cancel', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CancelCustomerFollowUpInput) =>
                    useCases.customerFollowUpCancel(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelCustomerFollowUpInput)),
            ),
        ),
    );
}
