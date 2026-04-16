import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
    VendorAddressEntity,
    VendorContactEntity,
    VendorPaymentProfileEntity,
    VendorEntity,
    VendorFollowUpEntity,
    VendorFollowUpStatus,
    VendorPriceProfileEntity,
    VendorTimelineEvent,
} from '../../domain/crm/types/VendorPayablesTypes';
import {
    CreateVendorDbInput,
    CreateVendorFollowUpDbInput,
    VendorChequeExposureRecord,
    VendorListFilters,
    VendorOpenInvoiceRecord,
    VendorPayablesPolicy,
    VendorPayablesRepositoryPort,
    VendorStatementQuery,
    VendorStatementRowRecord,
    VendorTimelineQuery,
    SaveVendorAddressDbInput,
    SaveVendorContactDbInput,
    SaveVendorPaymentProfileDbInput,
    SaveVendorHoldLogDbInput,
    SaveVendorPriceProfileDbInput,
    SetVendorFollowUpStatusDbInput,
    UpdateVendorDbInput,
    UpdateVendorFollowUpDbInput,
} from '../../application/ports/VendorPayablesPorts';

type VendorRow = {
    id: string;
    company_id: string | null;
    code: string | null;
    name: string | null;
    name_ar: string | null;
    tax_no: string | null;
    registration_no: string | null;
    phone: string | null;
    email: string | null;
    mobile: string | null;
    status: string | null;
    currency_code: string | null;
    payment_terms_id: string | null;
    payable_account_id: string | null;
    price_list_id: string | null;
    buyer_id: string | null;
    territory_id: string | null;
    payment_hold: number | null;
    is_active: number | null;
    remarks: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type ContactRow = {
    id: string;
    vendor_id: string;
    full_name: string | null;
    job_title: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    is_primary: number | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type AddressRow = {
    id: string;
    vendor_id: string;
    address_type: string | null;
    label: string | null;
    country_code: string | null;
    city: string | null;
    region: string | null;
    street: string | null;
    postal_code: string | null;
    is_primary: number | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type PaymentProfileRow = {
    id: string;
    vendor_id: string;
    payment_limit: number | null;
    overdue_limit: number | null;
    max_bill_age_days: number | null;
    risk_level: string | null;
    requires_approval_on_hold: number | null;
    auto_hold_on_overdue: number | null;
    auto_hold_on_payment_limit: number | null;
    hold_reason: string | null;
    last_review_date: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type PriceProfileRow = {
    id: string;
    vendor_id: string;
    price_list_id: string | null;
    discount_percent: number | null;
    effective_from: string | null;
    effective_to: string | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type FollowUpRow = {
    id: string;
    company_id: string | null;
    vendor_id: string | null;
    follow_up_date: string | null;
    follow_up_type: string | null;
    status: string | null;
    assigned_to: string | null;
    subject: string | null;
    note_text: string | null;
    expected_payment_amount: number | null;
    expected_payment_date: string | null;
    related_source_type: string | null;
    related_source_id: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type StatementRow = {
    id: string;
    vendor_id: string;
    event_date: string | null;
    due_date: string | null;
    source_type: string | null;
    source_id: string | null;
    source_no: string | null;
    reference_no: string | null;
    description: string | null;
    debit: number | null;
    credit: number | null;
    branch_id: string | null;
    journal_id: string;
    line_no: number | null;
};

const TRUE_VALUES = new Set(['1', 'TRUE', 'YES', 'Y', 'ON', 'ENABLED']);

export class SqliteVendorPayablesRepo implements VendorPayablesRepositoryPort {
    private readonly tableColumnsCache = new Map<string, Set<string>>();
    private tableExistsCache = new Map<string, boolean>();

    constructor(private readonly db: Database.Database) {
        this.ensureSchema();
    }

    ensureSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS crm_vendors (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                name_ar TEXT,
                tax_no TEXT,
                registration_no TEXT,
                phone TEXT,
                email TEXT,
                mobile TEXT,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                currency_code TEXT,
                payment_terms_id TEXT,
                payable_account_id TEXT,
                price_list_id TEXT,
                buyer_id TEXT,
                territory_id TEXT,
                payment_hold INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                remarks TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS crm_vendor_contacts (
                id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL,
                full_name TEXT NOT NULL,
                job_title TEXT,
                phone TEXT,
                mobile TEXT,
                email TEXT,
                is_primary INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_vendor_addresses (
                id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL,
                address_type TEXT NOT NULL,
                label TEXT,
                country_code TEXT,
                city TEXT,
                region TEXT,
                street TEXT,
                postal_code TEXT,
                is_primary INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_vendor_payment_profiles (
                id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL UNIQUE,
                payment_limit REAL NOT NULL DEFAULT 0,
                overdue_limit REAL NOT NULL DEFAULT 0,
                max_bill_age_days INTEGER,
                risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
                requires_approval_on_hold INTEGER NOT NULL DEFAULT 1,
                auto_hold_on_overdue INTEGER NOT NULL DEFAULT 0,
                auto_hold_on_payment_limit INTEGER NOT NULL DEFAULT 0,
                hold_reason TEXT,
                last_review_date TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_vendor_price_profiles (
                id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL,
                price_list_id TEXT NOT NULL,
                discount_percent REAL NOT NULL DEFAULT 0,
                effective_from TEXT,
                effective_to TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_vendor_follow_ups (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                vendor_id TEXT NOT NULL,
                follow_up_date TEXT NOT NULL,
                follow_up_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'OPEN',
                assigned_to TEXT,
                subject TEXT,
                note_text TEXT,
                expected_payment_amount REAL,
                expected_payment_date TEXT,
                related_source_type TEXT,
                related_source_id TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_vendor_hold_logs (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                vendor_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                reason TEXT NOT NULL,
                manual INTEGER NOT NULL DEFAULT 1,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_vendors_company_code
                ON crm_vendors(company_id, code);
            CREATE INDEX IF NOT EXISTS idx_crm_vendors_company_status
                ON crm_vendors(company_id, status, is_active, name, code);
            CREATE INDEX IF NOT EXISTS idx_crm_contacts_vendor
                ON crm_vendor_contacts(vendor_id, is_primary, full_name);
            CREATE INDEX IF NOT EXISTS idx_crm_addresses_vendor
                ON crm_vendor_addresses(vendor_id, address_type, is_primary);
            CREATE INDEX IF NOT EXISTS idx_crm_price_profiles_vendor
                ON crm_vendor_price_profiles(vendor_id, price_list_id);
            CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_vendor
                ON crm_vendor_follow_ups(company_id, vendor_id, status, follow_up_date);
            CREATE INDEX IF NOT EXISTS idx_crm_hold_logs_vendor
                ON crm_vendor_hold_logs(company_id, vendor_id, created_at);

            CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_contacts_primary_vendor
                ON crm_vendor_contacts(vendor_id)
                WHERE is_primary = 1;
            CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_addresses_primary_type
                ON crm_vendor_addresses(vendor_id, address_type)
                WHERE is_primary = 1;
        `);

        this.ensureBusinessPartnersCompatibility();
        this.seedVendorsFromBusinessPartners();
        this.clearTableCache();
    }

    nextIdentity(): string {
        return randomUUID();
    }

    runInTransaction<T>(work: () => T): T {
        return this.db.transaction(work)();
    }

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string {
        const normalized = String(rawCurrencyCode || '').trim();
        if (!normalized) return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized)) return normalized.toUpperCase();

        try {
            const row = this.db.prepare(`
                SELECT code
                FROM currencies
                WHERE id = ? OR UPPER(code) = UPPER(?)
                LIMIT 1
            `).get(normalized, normalized) as { code?: string | null } | undefined;
            return String(row?.code || 'ILS').trim().toUpperCase() || 'ILS';
        } catch {
            return 'ILS';
        }
    }

    private clearTableCache(): void {
        this.tableColumnsCache.clear();
        this.tableExistsCache.clear();
    }

    private tableExists(tableName: string): boolean {
        const key = String(tableName || '').trim().toLowerCase();
        if (!key) return false;
        if (this.tableExistsCache.has(key)) {
            return Boolean(this.tableExistsCache.get(key));
        }
        const row = this.db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND LOWER(name) = ?
            LIMIT 1
        `).get(key) as { name?: string } | undefined;
        const exists = Boolean(row?.name);
        this.tableExistsCache.set(key, exists);
        return exists;
    }

    private getTableColumns(tableName: string): Set<string> {
        const key = String(tableName || '').trim().toLowerCase();
        if (!key) return new Set<string>();
        const cached = this.tableColumnsCache.get(key);
        if (cached) return cached;

        const columns = new Set<string>();
        if (!this.tableExists(key)) {
            this.tableColumnsCache.set(key, columns);
            return columns;
        }

        const rows = this.db.prepare(`PRAGMA table_info(${key})`).all() as Array<{ name?: string }>;
        for (const row of rows) {
            const name = String(row?.name || '').trim().toLowerCase();
            if (name) columns.add(name);
        }
        this.tableColumnsCache.set(key, columns);
        return columns;
    }

    private hasColumn(tableName: string, columnName: string): boolean {
        return this.getTableColumns(tableName).has(String(columnName || '').trim().toLowerCase());
    }

    private safeAddColumn(tableName: string, columnName: string, columnSql: string): void {
        if (!this.tableExists(tableName)) return;
        if (this.hasColumn(tableName, columnName)) return;
        this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
        this.clearTableCache();
    }

    private ensureBusinessPartnersCompatibility(): void {
        if (!this.tableExists('business_partners')) return;

        this.safeAddColumn('business_partners', 'vendor_enabled', 'INTEGER DEFAULT 1');
        this.safeAddColumn('business_partners', 'vendor_code', 'TEXT');
        this.safeAddColumn('business_partners', 'vendor_name_ar', 'TEXT');
        this.safeAddColumn('business_partners', 'vendor_name_en', 'TEXT');
        this.safeAddColumn('business_partners', 'vendor_currency_id', 'TEXT');
        this.safeAddColumn('business_partners', 'vendor_account_id', 'TEXT');
        this.safeAddColumn('business_partners', 'buyer_id', 'TEXT');
        this.safeAddColumn('business_partners', 'sales_rep_id', 'TEXT');
        this.safeAddColumn('business_partners', 'payment_term_days', 'INTEGER DEFAULT 0');
    }

    private seedVendorsFromBusinessPartners(): void {
        if (!this.tableExists('business_partners')) return;

        this.db.exec(`
            INSERT OR IGNORE INTO crm_vendors (
                id, company_id, code, name, name_ar, tax_no, registration_no,
                phone, email, mobile, status, currency_code, payment_terms_id,
                payable_account_id, price_list_id, buyer_id, territory_id,
                payment_hold, is_active, remarks, created_at, updated_at
            )
            SELECT
                bp.id,
                'COMP_01',
                COALESCE(NULLIF(TRIM(bp.vendor_code), ''), NULLIF(TRIM(bp.code), ''), bp.id),
                COALESCE(NULLIF(TRIM(bp.vendor_name_en), ''), NULLIF(TRIM(bp.name_en), ''), NULLIF(TRIM(bp.name_ar), ''), bp.id),
                COALESCE(NULLIF(TRIM(bp.vendor_name_ar), ''), NULLIF(TRIM(bp.name_ar), ''), NULL),
                NULLIF(TRIM(bp.tax_number), ''),
                NULL,
                NULLIF(TRIM(bp.phone), ''),
                NULLIF(TRIM(bp.email), ''),
                NULLIF(TRIM(bp.mobile), ''),
                CASE
                    WHEN COALESCE(bp.is_active, 1) = 0 THEN 'INACTIVE'
                    ELSE 'ACTIVE'
                END,
                NULLIF(TRIM(bp.vendor_currency_id), ''),
                NULL,
                NULLIF(TRIM(bp.vendor_account_id), ''),
                NULLIF(TRIM(bp.price_list_id), ''),
                COALESCE(NULLIF(TRIM(bp.buyer_id), ''), NULLIF(TRIM(bp.sales_rep_id), '')),
                NULLIF(TRIM(bp.region_id), ''),
                0,
                COALESCE(bp.is_active, 1),
                NULLIF(TRIM(bp.notes), ''),
                COALESCE(bp.created_at, CURRENT_TIMESTAMP),
                COALESCE(bp.created_at, CURRENT_TIMESTAMP)
            FROM business_partners bp
            WHERE UPPER(COALESCE(bp.type, 'SUPPLIER')) IN ('SUPPLIER', 'BOTH')
        `);
    }

    createVendor(input: CreateVendorDbInput): VendorEntity {
        this.db.prepare(`
            INSERT INTO crm_vendors (
                id, company_id, code, name, name_ar, tax_no, registration_no,
                phone, email, mobile, status, currency_code, payment_terms_id,
                payable_account_id, price_list_id, buyer_id, territory_id,
                payment_hold, is_active, remarks, created_at, updated_at
            ) VALUES (
                @id, @companyId, @code, @name, @nameAr, @taxNo, @registrationNo,
                @phone, @email, @mobile, @status, @currencyCode, @paymentTermsId,
                @payableAccountId, @priceListId, @buyerId, @territoryId,
                @paymentHold, @isActive, @remarks, @createdAt, @updatedAt
            )
        `).run({
            ...input,
            paymentHold: input.paymentHold ? 1 : 0,
            isActive: input.isActive ? 1 : 0,
        });

        this.syncBusinessPartnerFromVendor(input.companyId, input.id);
        return this.getVendorById(input.companyId, input.id) as VendorEntity;
    }

    updateVendor(input: UpdateVendorDbInput): VendorEntity {
        this.db.prepare(`
            UPDATE crm_vendors
            SET code = @code,
                name = @name,
                name_ar = @nameAr,
                tax_no = @taxNo,
                registration_no = @registrationNo,
                phone = @phone,
                email = @email,
                mobile = @mobile,
                status = @status,
                currency_code = @currencyCode,
                payment_terms_id = @paymentTermsId,
                payable_account_id = @payableAccountId,
                price_list_id = @priceListId,
                buyer_id = @buyerId,
                territory_id = @territoryId,
                payment_hold = @paymentHold,
                is_active = @isActive,
                remarks = @remarks,
                updated_at = @updatedAt
            WHERE company_id = @companyId
              AND id = @id
        `).run({
            ...input,
            paymentHold: input.paymentHold ? 1 : 0,
            isActive: input.isActive ? 1 : 0,
        });

        this.syncBusinessPartnerFromVendor(input.companyId, input.id);
        return this.getVendorById(input.companyId, input.id) as VendorEntity;
    }

    getVendorById(companyId: string, vendorId: string): VendorEntity | null {
        const row = this.db.prepare(`
            SELECT *
            FROM crm_vendors
            WHERE company_id = ?
              AND id = ?
            LIMIT 1
        `).get(companyId, vendorId) as VendorRow | undefined;

        if (!row) return null;
        return this.mapVendor(row);
    }

    getVendorByCode(companyId: string, code: string): VendorEntity | null {
        const row = this.db.prepare(`
            SELECT *
            FROM crm_vendors
            WHERE company_id = ?
              AND UPPER(code) = UPPER(?)
            LIMIT 1
        `).get(companyId, code) as VendorRow | undefined;

        if (!row) return null;
        return this.mapVendor(row);
    }

    listVendors(companyId: string, filters: VendorListFilters): VendorEntity[] {
        const clauses = ['company_id = ?'];
        const params: Array<string | number> = [companyId];

        if (filters.isActive != null) {
            clauses.push('COALESCE(is_active, 1) = ?');
            params.push(filters.isActive ? 1 : 0);
        }
        if (filters.status) {
            clauses.push('UPPER(COALESCE(status, \'ACTIVE\')) = ?');
            params.push(String(filters.status).toUpperCase());
        }
        if (filters.search) {
            clauses.push(`(
                UPPER(COALESCE(code, '')) LIKE UPPER(?)
                OR UPPER(COALESCE(name, '')) LIKE UPPER(?)
                OR UPPER(COALESCE(name_ar, '')) LIKE UPPER(?)
                OR UPPER(COALESCE(phone, '')) LIKE UPPER(?)
                OR UPPER(COALESCE(email, '')) LIKE UPPER(?)
            )`);
            const pattern = `%${filters.search}%`;
            params.push(pattern, pattern, pattern, pattern, pattern);
        }

        params.push(filters.limit, filters.offset);
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_vendors
            WHERE ${clauses.join(' AND ')}
            ORDER BY UPPER(COALESCE(code, '')), UPPER(COALESCE(name, '')), id
            LIMIT ?
            OFFSET ?
        `).all(...params) as VendorRow[];

        return rows.map((row) => this.mapVendor(row));
    }

    setVendorActive(companyId: string, vendorId: string, isActive: boolean, updatedAt: string): VendorEntity | null {
        this.db.prepare(`
            UPDATE crm_vendors
            SET is_active = ?,
                status = CASE
                    WHEN ? = 0 THEN 'INACTIVE'
                    WHEN UPPER(COALESCE(status, 'ACTIVE')) = 'INACTIVE' THEN 'ACTIVE'
                    ELSE status
                END,
                updated_at = ?
            WHERE company_id = ?
              AND id = ?
        `).run(isActive ? 1 : 0, isActive ? 1 : 0, updatedAt, companyId, vendorId);

        this.syncBusinessPartnerFromVendor(companyId, vendorId);
        return this.getVendorById(companyId, vendorId);
    }

    listVendorContacts(vendorId: string): VendorContactEntity[] {
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_vendor_contacts
            WHERE vendor_id = ?
            ORDER BY is_primary DESC, UPPER(COALESCE(full_name, '')), id
        `).all(vendorId) as ContactRow[];
        return rows.map((row) => this.mapContact(row));
    }

    saveVendorContact(input: SaveVendorContactDbInput): VendorContactEntity {
        this.runInTransaction(() => {
            const countRow = this.db.prepare(`
                SELECT COUNT(1) AS count
                FROM crm_vendor_contacts
                WHERE vendor_id = ?
            `).get(input.vendorId) as { count?: number } | undefined;
            const hasAny = Number(countRow?.count || 0) > 0;
            const isPrimary = !hasAny ? true : Boolean(input.isPrimary);

            if (isPrimary) {
                this.db.prepare(`
                    UPDATE crm_vendor_contacts
                    SET is_primary = 0,
                        updated_at = ?
                    WHERE vendor_id = ?
                      AND id <> ?
                `).run(input.updatedAt, input.vendorId, input.id);
            }

            this.db.prepare(`
                INSERT INTO crm_vendor_contacts (
                    id, vendor_id, full_name, job_title, phone, mobile, email, is_primary, notes, created_at, updated_at
                ) VALUES (
                    @id, @vendorId, @fullName, @jobTitle, @phone, @mobile, @email, @isPrimary, @notes, @createdAt, @updatedAt
                )
                ON CONFLICT(id) DO UPDATE SET
                    vendor_id = excluded.vendor_id,
                    full_name = excluded.full_name,
                    job_title = excluded.job_title,
                    phone = excluded.phone,
                    mobile = excluded.mobile,
                    email = excluded.email,
                    is_primary = excluded.is_primary,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at
            `).run({
                ...input,
                isPrimary: isPrimary ? 1 : 0,
            });

            const primaryRow = this.db.prepare(`
                SELECT id
                FROM crm_vendor_contacts
                WHERE vendor_id = ?
                  AND is_primary = 1
                LIMIT 1
            `).get(input.vendorId) as { id?: string } | undefined;

            if (!primaryRow?.id) {
                this.db.prepare(`
                    UPDATE crm_vendor_contacts
                    SET is_primary = 1,
                        updated_at = ?
                    WHERE id = ?
                `).run(input.updatedAt, input.id);
            }
        });

        const row = this.db.prepare(`SELECT * FROM crm_vendor_contacts WHERE id = ?`).get(input.id) as ContactRow | undefined;
        return this.mapContact(row as ContactRow);
    }

    listVendorAddresses(vendorId: string): VendorAddressEntity[] {
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_vendor_addresses
            WHERE vendor_id = ?
            ORDER BY
                CASE UPPER(COALESCE(address_type, 'OTHER'))
                    WHEN 'BILLING' THEN 1
                    WHEN 'SHIPPING' THEN 2
                    ELSE 3
                END,
                is_primary DESC,
                id
        `).all(vendorId) as AddressRow[];
        return rows.map((row) => this.mapAddress(row));
    }

    saveVendorAddress(input: SaveVendorAddressDbInput): VendorAddressEntity {
        this.runInTransaction(() => {
            const countRow = this.db.prepare(`
                SELECT COUNT(1) AS count
                FROM crm_vendor_addresses
                WHERE vendor_id = ?
                  AND UPPER(address_type) = UPPER(?)
            `).get(input.vendorId, input.addressType) as { count?: number } | undefined;
            const hasTypeRows = Number(countRow?.count || 0) > 0;
            const isPrimary = !hasTypeRows ? true : Boolean(input.isPrimary);

            if (isPrimary) {
                this.db.prepare(`
                    UPDATE crm_vendor_addresses
                    SET is_primary = 0,
                        updated_at = ?
                    WHERE vendor_id = ?
                      AND UPPER(address_type) = UPPER(?)
                      AND id <> ?
                `).run(input.updatedAt, input.vendorId, input.addressType, input.id);
            }

            this.db.prepare(`
                INSERT INTO crm_vendor_addresses (
                    id, vendor_id, address_type, label, country_code, city, region, street, postal_code, is_primary, notes, created_at, updated_at
                ) VALUES (
                    @id, @vendorId, @addressType, @label, @countryCode, @city, @region, @street, @postalCode, @isPrimary, @notes, @createdAt, @updatedAt
                )
                ON CONFLICT(id) DO UPDATE SET
                    vendor_id = excluded.vendor_id,
                    address_type = excluded.address_type,
                    label = excluded.label,
                    country_code = excluded.country_code,
                    city = excluded.city,
                    region = excluded.region,
                    street = excluded.street,
                    postal_code = excluded.postal_code,
                    is_primary = excluded.is_primary,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at
            `).run({
                ...input,
                isPrimary: isPrimary ? 1 : 0,
            });

            const primaryRow = this.db.prepare(`
                SELECT id
                FROM crm_vendor_addresses
                WHERE vendor_id = ?
                  AND UPPER(address_type) = UPPER(?)
                  AND is_primary = 1
                LIMIT 1
            `).get(input.vendorId, input.addressType) as { id?: string } | undefined;

            if (!primaryRow?.id) {
                this.db.prepare(`
                    UPDATE crm_vendor_addresses
                    SET is_primary = 1,
                        updated_at = ?
                    WHERE id = ?
                `).run(input.updatedAt, input.id);
            }
        });

        const row = this.db.prepare(`SELECT * FROM crm_vendor_addresses WHERE id = ?`).get(input.id) as AddressRow | undefined;
        return this.mapAddress(row as AddressRow);
    }

    getVendorPaymentProfile(vendorId: string): VendorPaymentProfileEntity | null {
        const row = this.db.prepare(`
            SELECT *
            FROM crm_vendor_payment_profiles
            WHERE vendor_id = ?
            LIMIT 1
        `).get(vendorId) as PaymentProfileRow | undefined;
        if (!row) return null;
        return this.mapPaymentProfile(row);
    }

    saveVendorPaymentProfile(input: SaveVendorPaymentProfileDbInput): VendorPaymentProfileEntity {
        this.db.prepare(`
            INSERT INTO crm_vendor_payment_profiles (
                id, vendor_id, payment_limit, overdue_limit, max_bill_age_days,
                risk_level, requires_approval_on_hold, auto_hold_on_overdue, auto_hold_on_payment_limit,
                hold_reason, last_review_date, created_at, updated_at
            ) VALUES (
                @id, @vendorId, @paymentLimit, @overdueLimit, @maxBillAgeDays,
                @riskLevel, @requiresApprovalOnHold, @autoHoldOnOverdue, @autoHoldOnPaymentLimit,
                @holdReason, @lastReviewDate, @createdAt, @updatedAt
            )
            ON CONFLICT(vendor_id) DO UPDATE SET
                payment_limit = excluded.payment_limit,
                overdue_limit = excluded.overdue_limit,
                max_bill_age_days = excluded.max_bill_age_days,
                risk_level = excluded.risk_level,
                requires_approval_on_hold = excluded.requires_approval_on_hold,
                auto_hold_on_overdue = excluded.auto_hold_on_overdue,
                auto_hold_on_payment_limit = excluded.auto_hold_on_payment_limit,
                hold_reason = excluded.hold_reason,
                last_review_date = excluded.last_review_date,
                updated_at = excluded.updated_at
        `).run({
            ...input,
            requiresApprovalOnHold: input.requiresApprovalOnHold ? 1 : 0,
            autoHoldOnOverdue: input.autoHoldOnOverdue ? 1 : 0,
            autoHoldOnPaymentLimit: input.autoHoldOnPaymentLimit ? 1 : 0,
        });

        return this.getVendorPaymentProfile(input.vendorId) as VendorPaymentProfileEntity;
    }

    listVendorPriceProfiles(vendorId: string): VendorPriceProfileEntity[] {
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_vendor_price_profiles
            WHERE vendor_id = ?
            ORDER BY COALESCE(effective_from, ''), id
        `).all(vendorId) as PriceProfileRow[];
        return rows.map((row) => this.mapPriceProfile(row));
    }

    saveVendorPriceProfile(input: SaveVendorPriceProfileDbInput): VendorPriceProfileEntity {
        this.db.prepare(`
            INSERT INTO crm_vendor_price_profiles (
                id, vendor_id, price_list_id, discount_percent, effective_from, effective_to, notes, created_at, updated_at
            ) VALUES (
                @id, @vendorId, @priceListId, @discountPercent, @effectiveFrom, @effectiveTo, @notes, @createdAt, @updatedAt
            )
            ON CONFLICT(id) DO UPDATE SET
                vendor_id = excluded.vendor_id,
                price_list_id = excluded.price_list_id,
                discount_percent = excluded.discount_percent,
                effective_from = excluded.effective_from,
                effective_to = excluded.effective_to,
                notes = excluded.notes,
                updated_at = excluded.updated_at
        `).run(input);

        const row = this.db.prepare(`SELECT * FROM crm_vendor_price_profiles WHERE id = ?`).get(input.id) as PriceProfileRow | undefined;
        return this.mapPriceProfile(row as PriceProfileRow);
    }

    createVendorFollowUp(input: CreateVendorFollowUpDbInput): VendorFollowUpEntity {
        this.db.prepare(`
            INSERT INTO crm_vendor_follow_ups (
                id, company_id, vendor_id, follow_up_date, follow_up_type, status,
                assigned_to, subject, note_text, expected_payment_amount, expected_payment_date,
                related_source_type, related_source_id, created_at, updated_at
            ) VALUES (
                @id, @companyId, @vendorId, @followUpDate, @followUpType, @status,
                @assignedTo, @subject, @noteText, @expectedPaymentAmount, @expectedPaymentDate,
                @relatedSourceType, @relatedSourceId, @createdAt, @updatedAt
            )
        `).run(input);
        return this.getVendorFollowUpById(input.companyId, input.id) as VendorFollowUpEntity;
    }

    updateVendorFollowUp(input: UpdateVendorFollowUpDbInput): VendorFollowUpEntity {
        this.db.prepare(`
            UPDATE crm_vendor_follow_ups
            SET follow_up_date = @followUpDate,
                follow_up_type = @followUpType,
                assigned_to = @assignedTo,
                subject = @subject,
                note_text = @noteText,
                expected_payment_amount = @expectedPaymentAmount,
                expected_payment_date = @expectedPaymentDate,
                related_source_type = @relatedSourceType,
                related_source_id = @relatedSourceId,
                updated_at = @updatedAt
            WHERE id = @id
              AND company_id = @companyId
              AND vendor_id = @vendorId
        `).run(input);
        return this.getVendorFollowUpById(input.companyId, input.id) as VendorFollowUpEntity;
    }

    getVendorFollowUpById(companyId: string, followUpId: string): VendorFollowUpEntity | null {
        const row = this.db.prepare(`
            SELECT *
            FROM crm_vendor_follow_ups
            WHERE company_id = ?
              AND id = ?
            LIMIT 1
        `).get(companyId, followUpId) as FollowUpRow | undefined;
        if (!row) return null;
        return this.mapFollowUp(row);
    }

    listVendorFollowUps(companyId: string, vendorId: string, includeClosed: boolean): VendorFollowUpEntity[] {
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_vendor_follow_ups
            WHERE company_id = ?
              AND vendor_id = ?
              AND (? = 1 OR UPPER(COALESCE(status, 'OPEN')) = 'OPEN')
            ORDER BY follow_up_date DESC, updated_at DESC, id DESC
        `).all(companyId, vendorId, includeClosed ? 1 : 0) as FollowUpRow[];
        return rows.map((row) => this.mapFollowUp(row));
    }

    setVendorFollowUpStatus(input: SetVendorFollowUpStatusDbInput): VendorFollowUpEntity {
        this.db.prepare(`
            UPDATE crm_vendor_follow_ups
            SET status = @status,
                note_text = @noteText,
                updated_at = @updatedAt
            WHERE id = @id
              AND company_id = @companyId
              AND vendor_id = @vendorId
        `).run(input);
        return this.getVendorFollowUpById(input.companyId, input.id) as VendorFollowUpEntity;
    }

    saveVendorHoldLog(input: SaveVendorHoldLogDbInput): void {
        this.db.prepare(`
            INSERT INTO crm_vendor_hold_logs (
                id, company_id, vendor_id, action_type, reason, manual, created_by, created_at
            ) VALUES (
                @id, @companyId, @vendorId, @actionType, @reason, @manual, @createdBy, @createdAt
            )
        `).run({
            ...input,
            manual: input.manual ? 1 : 0,
        });
    }

    getPayableJournalBalance(companyId: string, vendorId: string, asOfDate: string, branchId: string | null): number {
        if (!this.tableExists('journals') || !this.tableExists('journal_lines')) return 0;

        const row = this.db.prepare(`
            SELECT COALESCE(SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)), 0) AS balance
            FROM journal_lines l
            JOIN journals j ON j.id = l.journal_id
            WHERE j.company_id = ?
              AND l.partner_id = ?
              AND UPPER(COALESCE(j.status, 'POSTED')) = 'POSTED'
              AND COALESCE(j.journal_date, SUBSTR(COALESCE(j.posted_at, CURRENT_TIMESTAMP), 1, 10)) <= ?
              AND (? IS NULL OR COALESCE(j.branch_id, '') = ?)
        `).get(companyId, vendorId, asOfDate, branchId, branchId) as { balance?: number } | undefined;

        return this.round(Number(row?.balance || 0));
    }

    listOpenPurchaseInvoices(companyId: string, vendorId: string, asOfDate: string, branchId: string | null): VendorOpenInvoiceRecord[] {
        if (!this.tableExists('purchase_invoices')) return [];
        const cols = this.getTableColumns('purchase_invoices');

        const dateExpr = this.pickColumnExpr('pi', cols, ['doc_date', 'date', 'invoice_date'], `SUBSTR(COALESCE(pi.created_at, CURRENT_TIMESTAMP), 1, 10)`);
        const dueExpr = this.pickColumnExpr('pi', cols, ['due_date', 'doc_date', 'date', 'invoice_date'], dateExpr);
        const noExpr = this.pickColumnExpr('pi', cols, ['invoice_no', 'doc_no'], 'pi.id');
        const paymentStatusExpr = this.pickColumnExpr('pi', cols, ['payment_status'], `'UNPAID'`);
        const totalExpr = this.pickColumnExpr('pi', cols, ['total_amount', 'grand_total', 'net_total', 'subtotal'], '0');
        const paidExpr = this.pickColumnExpr('pi', cols, ['paid_amount', 'amount_paid', 'payment_amount', 'allocated_amount'], '0');
        const statusExpr = this.pickColumnExpr('pi', cols, ['status'], `'POSTED'`);
        const companyExpr = this.pickColumnExpr('pi', cols, ['company_id'], `'COMP_01'`);
        const branchExpr = this.pickColumnExpr('pi', cols, ['branch_id'], `''`);
        const vendorExpr = this.pickColumnExpr('pi', cols, ['vendor_id', 'supplier_id'], `''`);

        const rows = this.db.prepare(`
            SELECT
                pi.id AS source_id,
                ${noExpr} AS source_no,
                ${dateExpr} AS doc_date,
                ${dueExpr} AS due_date,
                ${paymentStatusExpr} AS payment_status,
                CASE
                    WHEN (${totalExpr} - ${paidExpr}) > 0 THEN (${totalExpr} - ${paidExpr})
                    ELSE ${totalExpr}
                END AS amount
            FROM purchase_invoices pi
            WHERE COALESCE(${companyExpr}, 'COMP_01') = ?
              AND COALESCE(${vendorExpr}, '') = ?
              AND UPPER(COALESCE(${statusExpr}, 'POSTED')) NOT IN ('DRAFT', 'VOID', 'CANCELLED')
              AND COALESCE(${dateExpr}, '') <= ?
              AND (? IS NULL OR COALESCE(${branchExpr}, '') = ?)
              AND (
                UPPER(COALESCE(${paymentStatusExpr}, 'UNPAID')) <> 'PAID'
                OR (${totalExpr} - ${paidExpr}) > 0
              )
            ORDER BY ${dateExpr}, pi.id
        `).all(companyId, vendorId, asOfDate, branchId, branchId) as Array<{
            source_id: string;
            source_no: string | null;
            doc_date: string | null;
            due_date: string | null;
            payment_status: string | null;
            amount: number | null;
        }>;

        return rows
            .map((row) => ({
                sourceType: 'PURCHASE_INVOICE',
                sourceId: row.source_id,
                sourceNo: String(row.source_no || row.source_id || ''),
                docDate: String(row.doc_date || '').slice(0, 10),
                dueDate: String(row.due_date || row.doc_date || '').slice(0, 10),
                paymentStatus: String(row.payment_status || 'UNPAID').toUpperCase(),
                amount: this.round(Math.max(Number(row.amount || 0), 0)),
            }))
            .filter((row) => row.docDate && row.amount > 0);
    }

    sumOpenPurchaseOrders(companyId: string, vendorId: string, asOfDate: string, branchId: string | null): number {
        if (!this.tableExists('purchase_operation_documents')) return 0;
        const row = this.db.prepare(`
            SELECT COALESCE(SUM(COALESCE(total_amount, 0)), 0) AS amount
            FROM purchase_operation_documents
            WHERE company_id = ?
              AND vendor_id = ?
              AND UPPER(COALESCE(doc_type, '')) = 'PURCHASE_ORDER'
              AND UPPER(COALESCE(status, 'DRAFT')) NOT IN ('COMPLETED', 'CANCELLED')
              AND COALESCE(doc_date, '') <= ?
              AND (? IS NULL OR COALESCE(branch_id, '') = ?)
        `).get(companyId, vendorId, asOfDate, branchId, branchId) as { amount?: number } | undefined;
        return this.round(Number(row?.amount || 0));
    }

    getIssuedChequeExposure(companyId: string, vendorId: string, asOfDate: string, branchId: string | null): VendorChequeExposureRecord {
        if (this.tableExists('cheque_register')) {
            const row = this.db.prepare(`
                SELECT
                    COALESCE(SUM(CASE
                        WHEN UPPER(COALESCE(status, '')) IN ('ISSUED_PENDING', 'ISSUED')
                             THEN COALESCE(amount, 0)
                        ELSE 0
                    END), 0) AS issued_uncleared_amount
                FROM cheque_register
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(partner_id, '') = ?
                  AND UPPER(COALESCE(direction, 'ISSUED')) = 'ISSUED'
                  AND COALESCE(COALESCE(due_date, cheque_date), '') <= ?
                  AND (? IS NULL OR COALESCE(branch_id, '') = ?)
            `).get(companyId, vendorId, asOfDate, branchId, branchId) as {
                issued_uncleared_amount?: number;
            } | undefined;

            return {
                issuedUnclearedAmount: this.round(Number(row?.issued_uncleared_amount || 0)),
            };
        }

        if (this.tableExists('cheques')) {
            const row = this.db.prepare(`
                SELECT
                    COALESCE(SUM(CASE
                        WHEN UPPER(COALESCE(status, '')) NOT IN ('CLEARED', 'CANCELLED')
                             THEN COALESCE(amount, 0)
                        ELSE 0
                    END), 0) AS issued_uncleared_amount
                FROM cheques
                WHERE COALESCE(partner_id, '') = ?
                  AND UPPER(COALESCE(type, 'OUTGOING')) = 'OUTGOING'
                  AND COALESCE(due_date, '') <= ?
            `).get(vendorId, asOfDate) as {
                issued_uncleared_amount?: number;
            } | undefined;

            return {
                issuedUnclearedAmount: this.round(Number(row?.issued_uncleared_amount || 0)),
            };
        }

        return { issuedUnclearedAmount: 0 };
    }

    listStatementRows(query: VendorStatementQuery): VendorStatementRowRecord[] {
        if (!this.tableExists('journals') || !this.tableExists('journal_lines')) return [];

        const hasPurchaseInvoices = this.tableExists('purchase_invoices');
        const purchaseCols = hasPurchaseInvoices ? this.getTableColumns('purchase_invoices') : new Set<string>();
        const joinInvoice = hasPurchaseInvoices ? 'LEFT JOIN purchase_invoices pi ON pi.id = j.source_id' : '';
        const dueExpr = hasPurchaseInvoices
            ? this.pickColumnExpr('pi', purchaseCols, ['due_date', 'doc_date', 'date', 'invoice_date'], `NULL`)
            : 'NULL';
        const paymentStatusExpr = hasPurchaseInvoices
            ? this.pickColumnExpr('pi', purchaseCols, ['payment_status'], `'UNPAID'`)
            : `'UNPAID'`;

        const rows = this.db.prepare(`
            SELECT
                l.id AS id,
                l.partner_id AS vendor_id,
                COALESCE(j.journal_date, SUBSTR(COALESCE(j.posted_at, CURRENT_TIMESTAMP), 1, 10)) AS event_date,
                ${dueExpr} AS due_date,
                COALESCE(j.source_type, 'ADJUSTMENT') AS source_type,
                COALESCE(j.source_id, j.id) AS source_id,
                NULLIF(TRIM(COALESCE(j.source_no, '')), '') AS source_no,
                NULLIF(TRIM(COALESCE(j.reference_no, '')), '') AS reference_no,
                COALESCE(l.description, j.description) AS description,
                COALESCE(l.debit, 0) AS debit,
                COALESCE(l.credit, 0) AS credit,
                NULLIF(TRIM(COALESCE(j.branch_id, '')), '') AS branch_id,
                j.id AS journal_id,
                COALESCE(l.line_no, 0) AS line_no,
                ${paymentStatusExpr} AS payment_status
            FROM journal_lines l
            JOIN journals j ON j.id = l.journal_id
            ${joinInvoice}
            WHERE j.company_id = ?
              AND l.partner_id = ?
              AND UPPER(COALESCE(j.status, 'POSTED')) = 'POSTED'
              AND (? IS NULL OR COALESCE(j.branch_id, '') = ?)
              AND (? IS NULL OR COALESCE(j.journal_date, SUBSTR(COALESCE(j.posted_at, CURRENT_TIMESTAMP), 1, 10)) >= ?)
              AND (? IS NULL OR COALESCE(j.journal_date, SUBSTR(COALESCE(j.posted_at, CURRENT_TIMESTAMP), 1, 10)) <= ?)
              AND (? = 0 OR (
                  UPPER(COALESCE(j.source_type, '')) IN ('PURCHASE_INVOICE', 'AP_INVOICE')
                  AND UPPER(COALESCE(${paymentStatusExpr}, 'UNPAID')) <> 'PAID'
              ))
            ORDER BY event_date, line_no, l.id
        `).all(
            query.companyId,
            query.vendorId,
            query.branchId,
            query.branchId,
            query.fromDate,
            query.fromDate,
            query.toDate,
            query.toDate,
            query.includeOpenOnly ? 1 : 0,
        ) as Array<StatementRow & { payment_status?: string | null }>;

        return rows.map((row) => ({
            id: row.id,
            vendorId: row.vendor_id,
            eventDate: String(row.event_date || '').slice(0, 10),
            dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null,
            sourceType: String(row.source_type || 'ADJUSTMENT').toUpperCase(),
            sourceId: String(row.source_id || ''),
            sourceNo: row.source_no || null,
            referenceNo: row.reference_no || null,
            description: row.description || null,
            debit: this.round(Number(row.debit || 0)),
            credit: this.round(Number(row.credit || 0)),
            branchId: row.branch_id || null,
            journalId: row.journal_id,
            lineNo: Number(row.line_no || 0),
        }));
    }

    listTimelineRows(query: VendorTimelineQuery): VendorTimelineEvent[] {
        const events: VendorTimelineEvent[] = [];

        if (this.tableExists('purchase_operation_documents')) {
            const rows = this.db.prepare(`
                SELECT
                    id,
                    vendor_id,
                    doc_date AS event_date,
                    doc_type AS event_type,
                    doc_type AS source_type,
                    id AS source_id,
                    doc_no AS source_no,
                    COALESCE(doc_type, 'PURCHASE_EVENT') AS title,
                    NULLIF(TRIM(COALESCE(remarks, '')), '') AS details,
                    status,
                    COALESCE(total_amount, 0) AS amount,
                    created_by
                FROM purchase_operation_documents
                WHERE company_id = ?
                  AND vendor_id = ?
                  AND (? IS NULL OR doc_date >= ?)
                  AND (? IS NULL OR doc_date <= ?)
            `).all(
                query.companyId,
                query.vendorId,
                query.fromDate,
                query.fromDate,
                query.toDate,
                query.toDate,
            ) as Array<{
                id: string;
                vendor_id: string;
                event_date: string | null;
                event_type: string | null;
                source_type: string | null;
                source_id: string;
                source_no: string | null;
                title: string | null;
                details: string | null;
                status: string | null;
                amount: number | null;
                created_by: string | null;
            }>;
            for (const row of rows) {
                events.push(this.toTimelineEvent(row));
            }
        }

        if (this.tableExists('purchase_invoices')) {
            const cols = this.getTableColumns('purchase_invoices');
            const dateExpr = this.pickColumnExpr('pi', cols, ['doc_date', 'date', 'invoice_date'], `SUBSTR(COALESCE(pi.created_at, CURRENT_TIMESTAMP), 1, 10)`);
            const noExpr = this.pickColumnExpr('pi', cols, ['invoice_no', 'doc_no'], 'pi.id');
            const statusExpr = this.pickColumnExpr('pi', cols, ['status'], `'POSTED'`);
            const amountExpr = this.pickColumnExpr('pi', cols, ['total_amount', 'grand_total', 'net_total', 'subtotal'], '0');
            const companyExpr = this.pickColumnExpr('pi', cols, ['company_id'], `'COMP_01'`);
            const vendorExpr = this.pickColumnExpr('pi', cols, ['vendor_id', 'supplier_id'], `''`);
            const createdByExpr = this.pickColumnExpr('pi', cols, ['created_by'], `NULL`);
            const remarksExpr = this.pickColumnExpr('pi', cols, ['remarks', 'notes'], `NULL`);

            const rows = this.db.prepare(`
                SELECT
                    pi.id AS id,
                    ${vendorExpr} AS vendor_id,
                    ${dateExpr} AS event_date,
                    'PURCHASE_INVOICE' AS event_type,
                    'PURCHASE_INVOICE' AS source_type,
                    pi.id AS source_id,
                    ${noExpr} AS source_no,
                    'PURCHASE_INVOICE' AS title,
                    ${remarksExpr} AS details,
                    ${statusExpr} AS status,
                    ${amountExpr} AS amount,
                    ${createdByExpr} AS created_by
                FROM purchase_invoices pi
                WHERE COALESCE(${companyExpr}, 'COMP_01') = ?
                  AND COALESCE(${vendorExpr}, '') = ?
                  AND (? IS NULL OR ${dateExpr} >= ?)
                  AND (? IS NULL OR ${dateExpr} <= ?)
            `).all(
                query.companyId,
                query.vendorId,
                query.fromDate,
                query.fromDate,
                query.toDate,
                query.toDate,
            ) as Array<{
                id: string;
                vendor_id: string;
                event_date: string | null;
                event_type: string | null;
                source_type: string | null;
                source_id: string;
                source_no: string | null;
                title: string | null;
                details: string | null;
                status: string | null;
                amount: number | null;
                created_by: string | null;
            }>;
            for (const row of rows) {
                events.push(this.toTimelineEvent(row));
            }
        }

        if (this.tableExists('treasury_documents')) {
            const rows = this.db.prepare(`
                SELECT
                    id,
                    partner_id AS vendor_id,
                    doc_date AS event_date,
                    doc_type AS event_type,
                    doc_type AS source_type,
                    id AS source_id,
                    doc_no AS source_no,
                    COALESCE(doc_type, 'TREASURY') AS title,
                    NULLIF(TRIM(COALESCE(remarks, '')), '') AS details,
                    status,
                    NULL AS amount,
                    created_by
                FROM treasury_documents
                WHERE company_id = ?
                  AND partner_id = ?
                  AND (? IS NULL OR doc_date >= ?)
                  AND (? IS NULL OR doc_date <= ?)
            `).all(
                query.companyId,
                query.vendorId,
                query.fromDate,
                query.fromDate,
                query.toDate,
                query.toDate,
            ) as Array<{
                id: string;
                vendor_id: string;
                event_date: string | null;
                event_type: string | null;
                source_type: string | null;
                source_id: string;
                source_no: string | null;
                title: string | null;
                details: string | null;
                status: string | null;
                amount: number | null;
                created_by: string | null;
            }>;
            for (const row of rows) {
                events.push(this.toTimelineEvent(row));
            }
        }

        if (this.tableExists('cheque_register')) {
            const rows = this.db.prepare(`
                SELECT
                    id,
                    partner_id AS vendor_id,
                    COALESCE(due_date, cheque_date) AS event_date,
                    'CHEQUE' AS event_type,
                    'CHEQUE_PAYMENT' AS source_type,
                    id AS source_id,
                    cheque_no AS source_no,
                    'CHEQUE_PAYMENT' AS title,
                    NULL AS details,
                    status,
                    amount,
                    NULL AS created_by
                FROM cheque_register
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND partner_id = ?
                  AND UPPER(COALESCE(direction, 'ISSUED')) = 'ISSUED'
                  AND (? IS NULL OR COALESCE(due_date, cheque_date) >= ?)
                  AND (? IS NULL OR COALESCE(due_date, cheque_date) <= ?)
            `).all(
                query.companyId,
                query.vendorId,
                query.fromDate,
                query.fromDate,
                query.toDate,
                query.toDate,
            ) as Array<{
                id: string;
                vendor_id: string;
                event_date: string | null;
                event_type: string | null;
                source_type: string | null;
                source_id: string;
                source_no: string | null;
                title: string | null;
                details: string | null;
                status: string | null;
                amount: number | null;
                created_by: string | null;
            }>;
            for (const row of rows) {
                events.push(this.toTimelineEvent(row));
            }
        }

        const followUpRows = this.db.prepare(`
            SELECT
                id,
                vendor_id,
                follow_up_date AS event_date,
                'PAYABLE_FOLLOW_UP' AS event_type,
                'PAYABLE_FOLLOW_UP' AS source_type,
                id AS source_id,
                NULL AS source_no,
                COALESCE(subject, follow_up_type, 'FOLLOW_UP') AS title,
                note_text AS details,
                status,
                expected_payment_amount AS amount,
                assigned_to AS created_by
            FROM crm_vendor_follow_ups
            WHERE company_id = ?
              AND vendor_id = ?
              AND (? IS NULL OR follow_up_date >= ?)
              AND (? IS NULL OR follow_up_date <= ?)
        `).all(
            query.companyId,
            query.vendorId,
            query.fromDate,
            query.fromDate,
            query.toDate,
            query.toDate,
        ) as Array<{
            id: string;
            vendor_id: string;
            event_date: string | null;
            event_type: string | null;
            source_type: string | null;
            source_id: string;
            source_no: string | null;
            title: string | null;
            details: string | null;
            status: string | null;
            amount: number | null;
            created_by: string | null;
        }>;
        for (const row of followUpRows) {
            events.push(this.toTimelineEvent(row));
        }

        return events
            .filter((row) => row.eventDate)
            .sort((a, b) => {
                if (a.eventDate !== b.eventDate) return b.eventDate.localeCompare(a.eventDate);
                return b.id.localeCompare(a.id);
            })
            .slice(0, Math.max(1, Math.min(query.limit, 1000)));
    }

    getPolicy(companyId: string): VendorPayablesPolicy {
        return {
            includeOpenOrdersInExposure: this.readBooleanSetting(companyId, [
                'crm.include_open_orders_in_exposure',
                'payables.include_open_orders',
            ], false),
            includeIssuedUnclearedChequesInExposure: this.readBooleanSetting(companyId, [
                'payables.include_issued_uncleared_cheques',
                'payables.include_issued_cheques',
            ], false),
        };
    }

    private readBooleanSetting(companyId: string, keys: string[], fallback: boolean): boolean {
        if (!this.tableExists('settings') || !keys.length) return fallback;

        const placeholders = keys.map(() => '?').join(', ');
        const row = this.db.prepare(`
            SELECT value
            FROM settings
            WHERE key IN (${placeholders})
            ORDER BY CASE key
                ${keys.map((key, index) => `WHEN '${key}' THEN ${index + 1}`).join(' ')}
                ELSE 1000
            END
            LIMIT 1
        `).get(...keys) as { value?: string | number | null } | undefined;

        const normalized = String(row?.value ?? '').trim().toUpperCase();
        if (!normalized) return fallback;
        if (normalized === '0' || normalized === 'FALSE' || normalized === 'NO' || normalized === 'OFF' || normalized === 'DISABLED') {
            return false;
        }
        return TRUE_VALUES.has(normalized);
    }

    private syncBusinessPartnerFromVendor(companyId: string, vendorId: string): void {
        if (!this.tableExists('business_partners')) return;
        const vendor = this.getVendorById(companyId, vendorId);
        if (!vendor) return;

        const row = this.db.prepare(`
            SELECT id, type, created_at
            FROM business_partners
            WHERE id = ?
            LIMIT 1
        `).get(vendorId) as { id?: string; type?: string | null; created_at?: string | null } | undefined;

        const partnerType = this.normalizePartnerType(row?.type || null);
        const paymentTermDays = this.resolvePaymentTermDays(vendor.paymentTermsId);

        if (!row?.id) {
            this.db.prepare(`
                INSERT INTO business_partners (
                    id, code, name_ar, name_en, type, phone, mobile, email, city, tax_number,
                    linked_account_id, payment_limit, payment_term_days, price_list_id, is_active, created_at,
                    vendor_enabled, vendor_code, vendor_name_ar, vendor_name_en, vendor_currency_id, vendor_account_id, buyer_id, sales_rep_id
                ) VALUES (
                    @id, @code, @nameAr, @nameEn, @type, @phone, @mobile, @email, NULL, @taxNo,
                    @linkedAccountId, @paymentLimit, @paymentTermDays, @priceListId, @isActive, @createdAt,
                    1, @vendorCode, @vendorNameAr, @vendorNameEn, @vendorCurrencyId, @vendorAccountId, @buyerId, @salesRepId
                )
            `).run({
                id: vendor.id,
                code: vendor.code,
                nameAr: vendor.nameAr || vendor.name,
                nameEn: vendor.name,
                type: partnerType,
                phone: vendor.phone,
                mobile: vendor.mobile,
                email: vendor.email,
                taxNo: vendor.taxNo,
                linkedAccountId: vendor.payableAccountId,
                paymentLimit: this.getVendorPaymentProfile(vendor.id)?.paymentLimit || 0,
                paymentTermDays,
                priceListId: vendor.priceListId,
                isActive: vendor.isActive ? 1 : 0,
                createdAt: vendor.createdAt,
                vendorCode: vendor.code,
                vendorNameAr: vendor.nameAr || vendor.name,
                vendorNameEn: vendor.name,
                vendorCurrencyId: vendor.currencyCode,
                vendorAccountId: vendor.payableAccountId,
                buyerId: vendor.buyerId,
                salesRepId: vendor.buyerId,
            });
            return;
        }

        this.db.prepare(`
            UPDATE business_partners
            SET code = ?,
                name_ar = ?,
                name_en = ?,
                type = ?,
                phone = ?,
                mobile = ?,
                email = ?,
                tax_number = ?,
                linked_account_id = ?,
                payment_term_days = ?,
                price_list_id = ?,
                is_active = ?,
                vendor_enabled = 1,
                vendor_code = ?,
                vendor_name_ar = ?,
                vendor_name_en = ?,
                vendor_currency_id = ?,
                vendor_account_id = ?,
                buyer_id = ?,
                sales_rep_id = ?
            WHERE id = ?
        `).run(
            vendor.code,
            vendor.nameAr || vendor.name,
            vendor.name,
            partnerType,
            vendor.phone,
            vendor.mobile,
            vendor.email,
            vendor.taxNo,
            vendor.payableAccountId,
            paymentTermDays,
            vendor.priceListId,
            vendor.isActive ? 1 : 0,
            vendor.code,
            vendor.nameAr || vendor.name,
            vendor.name,
            vendor.currencyCode,
            vendor.payableAccountId,
            vendor.buyerId,
            vendor.buyerId,
            vendor.id,
        );
    }

    private resolvePaymentTermDays(paymentTermsId: string | null): number {
        if (!paymentTermsId || !this.tableExists('payment_terms')) return 0;
        const row = this.db.prepare(`
            SELECT days
            FROM payment_terms
            WHERE id = ?
            LIMIT 1
        `).get(paymentTermsId) as { days?: number | null } | undefined;
        return Number(row?.days || 0);
    }

    private normalizePartnerType(value: string | null): string {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'BOTH' || normalized === 'SUPPLIER') return normalized;
        if (normalized === 'CUSTOMER') return 'BOTH';
        return 'SUPPLIER';
    }

    private pickColumnExpr(alias: string, columns: Set<string>, preferred: string[], fallbackSql: string): string {
        for (const column of preferred) {
            if (columns.has(column.toLowerCase())) {
                return `${alias}.${column}`;
            }
        }
        return fallbackSql;
    }

    private toTimelineEvent(row: {
        id: string;
        vendor_id: string;
        event_date: string | null;
        event_type: string | null;
        source_type: string | null;
        source_id: string;
        source_no: string | null;
        title: string | null;
        details: string | null;
        status: string | null;
        amount: number | null;
        created_by: string | null;
    }): VendorTimelineEvent {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            eventDate: String(row.event_date || '').slice(0, 10),
            eventType: String(row.event_type || 'EVENT').toUpperCase(),
            sourceType: String(row.source_type || 'EVENT').toUpperCase(),
            sourceId: row.source_id,
            sourceNo: row.source_no || null,
            title: String(row.title || row.event_type || 'EVENT'),
            details: row.details || null,
            status: row.status || null,
            amount: row.amount == null ? null : this.round(Number(row.amount || 0)),
            createdBy: row.created_by || null,
        };
    }

    private mapVendor(row: VendorRow): VendorEntity {
        return {
            id: row.id,
            companyId: String(row.company_id || 'COMP_01'),
            code: String(row.code || ''),
            name: String(row.name || ''),
            nameAr: row.name_ar || null,
            taxNo: row.tax_no || null,
            registrationNo: row.registration_no || null,
            phone: row.phone || null,
            email: row.email || null,
            mobile: row.mobile || null,
            status: (String(row.status || 'ACTIVE').toUpperCase() as VendorEntity['status']),
            currencyCode: row.currency_code || null,
            paymentTermsId: row.payment_terms_id || null,
            payableAccountId: row.payable_account_id || null,
            priceListId: row.price_list_id || null,
            buyerId: row.buyer_id || null,
            territoryId: row.territory_id || null,
            paymentHold: Number(row.payment_hold || 0) === 1,
            isActive: Number(row.is_active ?? 1) === 1,
            remarks: row.remarks || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }

    private mapContact(row: ContactRow): VendorContactEntity {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            fullName: String(row.full_name || ''),
            jobTitle: row.job_title || null,
            phone: row.phone || null,
            mobile: row.mobile || null,
            email: row.email || null,
            isPrimary: Number(row.is_primary || 0) === 1,
            notes: row.notes || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }

    private mapAddress(row: AddressRow): VendorAddressEntity {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            addressType: String(row.address_type || 'OTHER').toUpperCase() as VendorAddressEntity['addressType'],
            label: row.label || null,
            countryCode: row.country_code || null,
            city: row.city || null,
            region: row.region || null,
            street: row.street || null,
            postalCode: row.postal_code || null,
            isPrimary: Number(row.is_primary || 0) === 1,
            notes: row.notes || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }

    private mapPaymentProfile(row: PaymentProfileRow): VendorPaymentProfileEntity {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            paymentLimit: this.round(Number(row.payment_limit || 0)),
            overdueLimit: this.round(Number(row.overdue_limit || 0)),
            maxBillAgeDays: row.max_bill_age_days == null ? null : Number(row.max_bill_age_days),
            riskLevel: (String(row.risk_level || 'MEDIUM').toUpperCase() as VendorPaymentProfileEntity['riskLevel']),
            requiresApprovalOnHold: Number(row.requires_approval_on_hold ?? 1) === 1,
            autoHoldOnOverdue: Number(row.auto_hold_on_overdue ?? 0) === 1,
            autoHoldOnPaymentLimit: Number(row.auto_hold_on_payment_limit ?? 0) === 1,
            holdReason: row.hold_reason || null,
            lastReviewDate: row.last_review_date || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }

    private mapPriceProfile(row: PriceProfileRow): VendorPriceProfileEntity {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            priceListId: String(row.price_list_id || ''),
            discountPercent: this.round(Number(row.discount_percent || 0)),
            effectiveFrom: row.effective_from || null,
            effectiveTo: row.effective_to || null,
            notes: row.notes || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }

    private mapFollowUp(row: FollowUpRow): VendorFollowUpEntity {
        return {
            id: row.id,
            companyId: String(row.company_id || 'COMP_01'),
            vendorId: String(row.vendor_id || ''),
            followUpDate: String(row.follow_up_date || ''),
            followUpType: String(row.follow_up_type || 'CALL').toUpperCase() as VendorFollowUpEntity['followUpType'],
            status: String(row.status || 'OPEN').toUpperCase() as VendorFollowUpStatus,
            assignedTo: row.assigned_to || null,
            subject: row.subject || null,
            noteText: row.note_text || null,
            expectedPaymentAmount: row.expected_payment_amount == null ? null : this.round(Number(row.expected_payment_amount || 0)),
            expectedPaymentDate: row.expected_payment_date || null,
            relatedSourceType: row.related_source_type || null,
            relatedSourceId: row.related_source_id || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }

    private round(value: number): number {
        return Math.round((Number(value) + Number.EPSILON) * 1000000) / 1000000;
    }
}
