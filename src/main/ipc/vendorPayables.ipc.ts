import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { VendorPayablesUseCases } from '../application/useCases/VendorPayablesUseCases';
import {
    CancelVendorFollowUpInput,
    CreateVendorFollowUpInput,
    CreateVendorInput,
    VendorAgingQueryInput,
    VendorStatementQueryInput,
    VendorTimelineQueryInput,
    EvaluateVendorPaymentControlInput,
    ListVendorsInput,
    MarkVendorFollowUpDoneInput,
    PlaceVendorHoldInput,
    ReleaseVendorHoldInput,
    SaveVendorAddressInput,
    SaveVendorContactInput,
    SaveVendorPaymentProfileInput,
    SetVendorActiveInput,
    UpdateVendorFollowUpInput,
    UpdateVendorInput,
} from '../domain/crm/types/VendorPayablesTypes';

const LEGACY_PERMISSIONS = {
    READ: ['vendor.view', 'payables.view', 'collections.view', 'system.settings'],
    WRITE: ['vendor.manage', 'payables.manage', 'collections.manage', 'system.settings'],
    CONTROL: ['vendor.payment_control', 'payables.manage', 'system.settings'],
} as const;

export function registerVendorPayablesIPC(useCases: VendorPayablesUseCases): void {
    ipcMain.handle(
        'vendor.create',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateVendorInput) =>
                    useCases.vendorCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateVendorInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.update',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.update', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: UpdateVendorInput) =>
                    useCases.vendorUpdate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateVendorInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.getById',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.getById', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, vendorId: string) =>
                    useCases.vendorGetById(ctx.companyId, String(vendorId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.list',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.list', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: ListVendorsInput) =>
                    useCases.vendorList(ctx.companyId, payload || {}),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.setActive',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.setActive', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: SetVendorActiveInput) =>
                    useCases.vendorSetActive(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as SetVendorActiveInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.getContacts',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.getContacts', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, vendorId: string) =>
                    useCases.vendorGetContacts(ctx.companyId, String(vendorId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.saveContact',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.saveContact', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: SaveVendorContactInput) =>
                    useCases.vendorSaveContact(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as SaveVendorContactInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.getAddresses',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.getAddresses', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, vendorId: string) =>
                    useCases.vendorGetAddresses(ctx.companyId, String(vendorId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.saveAddress',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.saveAddress', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: SaveVendorAddressInput) =>
                    useCases.vendorSaveAddress(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as SaveVendorAddressInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.getPaymentProfile',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.getPaymentProfile', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, vendorId: string) =>
                    useCases.vendorGetPaymentProfile(ctx.companyId, String(vendorId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.savePaymentProfile',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.savePaymentProfile', legacyPermissions: [...LEGACY_PERMISSIONS.CONTROL, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: SaveVendorPaymentProfileInput) =>
                    useCases.vendorSavePaymentProfile(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as SaveVendorPaymentProfileInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.evaluatePaymentControl',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.evaluatePaymentControl', legacyPermissions: [...LEGACY_PERMISSIONS.CONTROL, ...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: EvaluateVendorPaymentControlInput) =>
                    useCases.vendorEvaluatePaymentControl(ctx.companyId, ctx.branchId, payload || ({} as EvaluateVendorPaymentControlInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.placeHold',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.placeHold', legacyPermissions: [...LEGACY_PERMISSIONS.CONTROL] },
                async (ctx, _event, payload: PlaceVendorHoldInput) =>
                    useCases.vendorPlaceHold(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as PlaceVendorHoldInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.releaseHold',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.releaseHold', legacyPermissions: [...LEGACY_PERMISSIONS.CONTROL] },
                async (ctx, _event, payload: ReleaseVendorHoldInput) =>
                    useCases.vendorReleaseHold(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ReleaseVendorHoldInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.getExposure',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.getExposure', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: EvaluateVendorPaymentControlInput) =>
                    useCases.vendorGetExposure(ctx.companyId, ctx.branchId, payload || ({} as EvaluateVendorPaymentControlInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.getStatement',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.getStatement', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: VendorStatementQueryInput) =>
                    useCases.vendorGetStatement(ctx.companyId, ctx.branchId, payload || ({} as VendorStatementQueryInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.getAging',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.getAging', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: VendorAgingQueryInput) =>
                    useCases.vendorGetAging(ctx.companyId, ctx.branchId, payload || ({} as VendorAgingQueryInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendor.getTimeline',
        ipcWrap(
            withGuards(
                { eventName: 'vendor.getTimeline', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, payload: VendorTimelineQueryInput) =>
                    useCases.vendorGetTimeline(ctx.companyId, payload || ({} as VendorTimelineQueryInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendorFollowUp.create',
        ipcWrap(
            withGuards(
                { eventName: 'vendorFollowUp.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateVendorFollowUpInput) =>
                    useCases.vendorFollowUpCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateVendorFollowUpInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendorFollowUp.update',
        ipcWrap(
            withGuards(
                { eventName: 'vendorFollowUp.update', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: UpdateVendorFollowUpInput) =>
                    useCases.vendorFollowUpUpdate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateVendorFollowUpInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendorFollowUp.getByVendor',
        ipcWrap(
            withGuards(
                { eventName: 'vendorFollowUp.getByVendor', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, vendorId: string, includeClosed?: boolean) =>
                    useCases.vendorFollowUpGetByVendor(ctx.companyId, String(vendorId || '').trim(), includeClosed),
            ),
        ),
    );

    ipcMain.handle(
        'vendorFollowUp.markDone',
        ipcWrap(
            withGuards(
                { eventName: 'vendorFollowUp.markDone', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: MarkVendorFollowUpDoneInput) =>
                    useCases.vendorFollowUpMarkDone(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as MarkVendorFollowUpDoneInput)),
            ),
        ),
    );

    ipcMain.handle(
        'vendorFollowUp.cancel',
        ipcWrap(
            withGuards(
                { eventName: 'vendorFollowUp.cancel', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CancelVendorFollowUpInput) =>
                    useCases.vendorFollowUpCancel(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelVendorFollowUpInput)),
            ),
        ),
    );
}

