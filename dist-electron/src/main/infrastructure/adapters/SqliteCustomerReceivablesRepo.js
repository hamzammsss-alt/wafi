"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteCustomerReceivablesRepo = void 0;
const crypto_1 = require("crypto");
const TRUE_VALUES = new Set(['1', 'TRUE', 'YES', 'Y', 'ON', 'ENABLED']);
class SqliteCustomerReceivablesRepo {
    constructor(db) {
        this.db = db;
        this.tableColumnsCache = new Map();
        this.tableExistsCache = new Map();
        this.ensureSchema();
    }
    ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS crm_customers (
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
                receivable_account_id TEXT,
                price_list_id TEXT,
                sales_person_id TEXT,
                territory_id TEXT,
                credit_hold INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                remarks TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS crm_customer_contacts (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                full_name TEXT NOT NULL,
                job_title TEXT,
                phone TEXT,
                mobile TEXT,
                email TEXT,
                is_primary INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_customer_addresses (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
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
                FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_customer_credit_profiles (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL UNIQUE,
                credit_limit REAL NOT NULL DEFAULT 0,
                overdue_limit REAL NOT NULL DEFAULT 0,
                max_invoice_age_days INTEGER,
                risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
                requires_approval_on_hold INTEGER NOT NULL DEFAULT 1,
                auto_hold_on_overdue INTEGER NOT NULL DEFAULT 1,
                auto_hold_on_credit_limit INTEGER NOT NULL DEFAULT 1,
                hold_reason TEXT,
                last_review_date TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_customer_price_profiles (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                price_list_id TEXT NOT NULL,
                discount_percent REAL NOT NULL DEFAULT 0,
                effective_from TEXT,
                effective_to TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_customer_follow_ups (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                follow_up_date TEXT NOT NULL,
                follow_up_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'OPEN',
                assigned_to TEXT,
                subject TEXT,
                note_text TEXT,
                promise_amount REAL,
                promise_date TEXT,
                related_source_type TEXT,
                related_source_id TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_customer_hold_logs (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                reason TEXT NOT NULL,
                manual INTEGER NOT NULL DEFAULT 1,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_customers_company_code
                ON crm_customers(company_id, code);
            CREATE INDEX IF NOT EXISTS idx_crm_customers_company_status
                ON crm_customers(company_id, status, is_active, name, code);
            CREATE INDEX IF NOT EXISTS idx_crm_contacts_customer
                ON crm_customer_contacts(customer_id, is_primary, full_name);
            CREATE INDEX IF NOT EXISTS idx_crm_addresses_customer
                ON crm_customer_addresses(customer_id, address_type, is_primary);
            CREATE INDEX IF NOT EXISTS idx_crm_price_profiles_customer
                ON crm_customer_price_profiles(customer_id, price_list_id);
            CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_customer
                ON crm_customer_follow_ups(company_id, customer_id, status, follow_up_date);
            CREATE INDEX IF NOT EXISTS idx_crm_hold_logs_customer
                ON crm_customer_hold_logs(company_id, customer_id, created_at);

            CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_contacts_primary_customer
                ON crm_customer_contacts(customer_id)
                WHERE is_primary = 1;
            CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_addresses_primary_type
                ON crm_customer_addresses(customer_id, address_type)
                WHERE is_primary = 1;
        `);
        this.ensureBusinessPartnersCompatibility();
        this.seedCustomersFromBusinessPartners();
        this.clearTableCache();
    }
    nextIdentity() {
        return (0, crypto_1.randomUUID)();
    }
    runInTransaction(work) {
        return this.db.transaction(work)();
    }
    resolveCurrencyCode(rawCurrencyCode) {
        const normalized = String(rawCurrencyCode || '').trim();
        if (!normalized)
            return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized))
            return normalized.toUpperCase();
        try {
            const row = this.db.prepare(`
                SELECT code
                FROM currencies
                WHERE id = ? OR UPPER(code) = UPPER(?)
                LIMIT 1
            `).get(normalized, normalized);
            return String(row?.code || 'ILS').trim().toUpperCase() || 'ILS';
        }
        catch {
            return 'ILS';
        }
    }
    clearTableCache() {
        this.tableColumnsCache.clear();
        this.tableExistsCache.clear();
    }
    tableExists(tableName) {
        const key = String(tableName || '').trim().toLowerCase();
        if (!key)
            return false;
        if (this.tableExistsCache.has(key)) {
            return Boolean(this.tableExistsCache.get(key));
        }
        const row = this.db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND LOWER(name) = ?
            LIMIT 1
        `).get(key);
        const exists = Boolean(row?.name);
        this.tableExistsCache.set(key, exists);
        return exists;
    }
    getTableColumns(tableName) {
        const key = String(tableName || '').trim().toLowerCase();
        if (!key)
            return new Set();
        const cached = this.tableColumnsCache.get(key);
        if (cached)
            return cached;
        const columns = new Set();
        if (!this.tableExists(key)) {
            this.tableColumnsCache.set(key, columns);
            return columns;
        }
        const rows = this.db.prepare(`PRAGMA table_info(${key})`).all();
        for (const row of rows) {
            const name = String(row?.name || '').trim().toLowerCase();
            if (name)
                columns.add(name);
        }
        this.tableColumnsCache.set(key, columns);
        return columns;
    }
    hasColumn(tableName, columnName) {
        return this.getTableColumns(tableName).has(String(columnName || '').trim().toLowerCase());
    }
    safeAddColumn(tableName, columnName, columnSql) {
        if (!this.tableExists(tableName))
            return;
        if (this.hasColumn(tableName, columnName))
            return;
        this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
        this.clearTableCache();
    }
    ensureBusinessPartnersCompatibility() {
        if (!this.tableExists('business_partners'))
            return;
        this.safeAddColumn('business_partners', 'customer_enabled', 'INTEGER DEFAULT 1');
        this.safeAddColumn('business_partners', 'customer_code', 'TEXT');
        this.safeAddColumn('business_partners', 'customer_name_ar', 'TEXT');
        this.safeAddColumn('business_partners', 'customer_name_en', 'TEXT');
        this.safeAddColumn('business_partners', 'customer_currency_id', 'TEXT');
        this.safeAddColumn('business_partners', 'customer_account_id', 'TEXT');
        this.safeAddColumn('business_partners', 'sales_rep_id', 'TEXT');
        this.safeAddColumn('business_partners', 'payment_term_days', 'INTEGER DEFAULT 0');
    }
    seedCustomersFromBusinessPartners() {
        if (!this.tableExists('business_partners'))
            return;
        this.db.exec(`
            INSERT OR IGNORE INTO crm_customers (
                id, company_id, code, name, name_ar, tax_no, registration_no,
                phone, email, mobile, status, currency_code, payment_terms_id,
                receivable_account_id, price_list_id, sales_person_id, territory_id,
                credit_hold, is_active, remarks, created_at, updated_at
            )
            SELECT
                bp.id,
                'COMP_01',
                COALESCE(NULLIF(TRIM(bp.customer_code), ''), NULLIF(TRIM(bp.code), ''), bp.id),
                COALESCE(NULLIF(TRIM(bp.customer_name_en), ''), NULLIF(TRIM(bp.name_en), ''), NULLIF(TRIM(bp.name_ar), ''), bp.id),
                COALESCE(NULLIF(TRIM(bp.customer_name_ar), ''), NULLIF(TRIM(bp.name_ar), ''), NULL),
                NULLIF(TRIM(bp.tax_number), ''),
                NULL,
                NULLIF(TRIM(bp.phone), ''),
                NULLIF(TRIM(bp.email), ''),
                NULLIF(TRIM(bp.mobile), ''),
                CASE
                    WHEN COALESCE(bp.is_active, 1) = 0 THEN 'INACTIVE'
                    ELSE 'ACTIVE'
                END,
                NULLIF(TRIM(bp.customer_currency_id), ''),
                NULL,
                NULLIF(TRIM(bp.customer_account_id), ''),
                NULLIF(TRIM(bp.price_list_id), ''),
                NULLIF(TRIM(bp.sales_rep_id), ''),
                NULLIF(TRIM(bp.region_id), ''),
                0,
                COALESCE(bp.is_active, 1),
                NULLIF(TRIM(bp.notes), ''),
                COALESCE(bp.created_at, CURRENT_TIMESTAMP),
                COALESCE(bp.created_at, CURRENT_TIMESTAMP)
            FROM business_partners bp
            WHERE UPPER(COALESCE(bp.type, 'CUSTOMER')) IN ('CUSTOMER', 'BOTH')
        `);
    }
    createCustomer(input) {
        this.db.prepare(`
            INSERT INTO crm_customers (
                id, company_id, code, name, name_ar, tax_no, registration_no,
                phone, email, mobile, status, currency_code, payment_terms_id,
                receivable_account_id, price_list_id, sales_person_id, territory_id,
                credit_hold, is_active, remarks, created_at, updated_at
            ) VALUES (
                @id, @companyId, @code, @name, @nameAr, @taxNo, @registrationNo,
                @phone, @email, @mobile, @status, @currencyCode, @paymentTermsId,
                @receivableAccountId, @priceListId, @salesPersonId, @territoryId,
                @creditHold, @isActive, @remarks, @createdAt, @updatedAt
            )
        `).run({
            ...input,
            creditHold: input.creditHold ? 1 : 0,
            isActive: input.isActive ? 1 : 0,
        });
        this.syncBusinessPartnerFromCustomer(input.companyId, input.id);
        return this.getCustomerById(input.companyId, input.id);
    }
    updateCustomer(input) {
        this.db.prepare(`
            UPDATE crm_customers
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
                receivable_account_id = @receivableAccountId,
                price_list_id = @priceListId,
                sales_person_id = @salesPersonId,
                territory_id = @territoryId,
                credit_hold = @creditHold,
                is_active = @isActive,
                remarks = @remarks,
                updated_at = @updatedAt
            WHERE company_id = @companyId
              AND id = @id
        `).run({
            ...input,
            creditHold: input.creditHold ? 1 : 0,
            isActive: input.isActive ? 1 : 0,
        });
        this.syncBusinessPartnerFromCustomer(input.companyId, input.id);
        return this.getCustomerById(input.companyId, input.id);
    }
    getCustomerById(companyId, customerId) {
        const row = this.db.prepare(`
            SELECT *
            FROM crm_customers
            WHERE company_id = ?
              AND id = ?
            LIMIT 1
        `).get(companyId, customerId);
        if (!row)
            return null;
        return this.mapCustomer(row);
    }
    getCustomerByCode(companyId, code) {
        const row = this.db.prepare(`
            SELECT *
            FROM crm_customers
            WHERE company_id = ?
              AND UPPER(code) = UPPER(?)
            LIMIT 1
        `).get(companyId, code);
        if (!row)
            return null;
        return this.mapCustomer(row);
    }
    listCustomers(companyId, filters) {
        const clauses = ['company_id = ?'];
        const params = [companyId];
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
            FROM crm_customers
            WHERE ${clauses.join(' AND ')}
            ORDER BY UPPER(COALESCE(code, '')), UPPER(COALESCE(name, '')), id
            LIMIT ?
            OFFSET ?
        `).all(...params);
        return rows.map((row) => this.mapCustomer(row));
    }
    setCustomerActive(companyId, customerId, isActive, updatedAt) {
        this.db.prepare(`
            UPDATE crm_customers
            SET is_active = ?,
                status = CASE
                    WHEN ? = 0 THEN 'INACTIVE'
                    WHEN UPPER(COALESCE(status, 'ACTIVE')) = 'INACTIVE' THEN 'ACTIVE'
                    ELSE status
                END,
                updated_at = ?
            WHERE company_id = ?
              AND id = ?
        `).run(isActive ? 1 : 0, isActive ? 1 : 0, updatedAt, companyId, customerId);
        this.syncBusinessPartnerFromCustomer(companyId, customerId);
        return this.getCustomerById(companyId, customerId);
    }
    listCustomerContacts(customerId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_customer_contacts
            WHERE customer_id = ?
            ORDER BY is_primary DESC, UPPER(COALESCE(full_name, '')), id
        `).all(customerId);
        return rows.map((row) => this.mapContact(row));
    }
    saveCustomerContact(input) {
        this.runInTransaction(() => {
            const countRow = this.db.prepare(`
                SELECT COUNT(1) AS count
                FROM crm_customer_contacts
                WHERE customer_id = ?
            `).get(input.customerId);
            const hasAny = Number(countRow?.count || 0) > 0;
            const isPrimary = !hasAny ? true : Boolean(input.isPrimary);
            if (isPrimary) {
                this.db.prepare(`
                    UPDATE crm_customer_contacts
                    SET is_primary = 0,
                        updated_at = ?
                    WHERE customer_id = ?
                      AND id <> ?
                `).run(input.updatedAt, input.customerId, input.id);
            }
            this.db.prepare(`
                INSERT INTO crm_customer_contacts (
                    id, customer_id, full_name, job_title, phone, mobile, email, is_primary, notes, created_at, updated_at
                ) VALUES (
                    @id, @customerId, @fullName, @jobTitle, @phone, @mobile, @email, @isPrimary, @notes, @createdAt, @updatedAt
                )
                ON CONFLICT(id) DO UPDATE SET
                    customer_id = excluded.customer_id,
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
                FROM crm_customer_contacts
                WHERE customer_id = ?
                  AND is_primary = 1
                LIMIT 1
            `).get(input.customerId);
            if (!primaryRow?.id) {
                this.db.prepare(`
                    UPDATE crm_customer_contacts
                    SET is_primary = 1,
                        updated_at = ?
                    WHERE id = ?
                `).run(input.updatedAt, input.id);
            }
        });
        const row = this.db.prepare(`SELECT * FROM crm_customer_contacts WHERE id = ?`).get(input.id);
        return this.mapContact(row);
    }
    listCustomerAddresses(customerId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_customer_addresses
            WHERE customer_id = ?
            ORDER BY
                CASE UPPER(COALESCE(address_type, 'OTHER'))
                    WHEN 'BILLING' THEN 1
                    WHEN 'SHIPPING' THEN 2
                    ELSE 3
                END,
                is_primary DESC,
                id
        `).all(customerId);
        return rows.map((row) => this.mapAddress(row));
    }
    saveCustomerAddress(input) {
        this.runInTransaction(() => {
            const countRow = this.db.prepare(`
                SELECT COUNT(1) AS count
                FROM crm_customer_addresses
                WHERE customer_id = ?
                  AND UPPER(address_type) = UPPER(?)
            `).get(input.customerId, input.addressType);
            const hasTypeRows = Number(countRow?.count || 0) > 0;
            const isPrimary = !hasTypeRows ? true : Boolean(input.isPrimary);
            if (isPrimary) {
                this.db.prepare(`
                    UPDATE crm_customer_addresses
                    SET is_primary = 0,
                        updated_at = ?
                    WHERE customer_id = ?
                      AND UPPER(address_type) = UPPER(?)
                      AND id <> ?
                `).run(input.updatedAt, input.customerId, input.addressType, input.id);
            }
            this.db.prepare(`
                INSERT INTO crm_customer_addresses (
                    id, customer_id, address_type, label, country_code, city, region, street, postal_code, is_primary, notes, created_at, updated_at
                ) VALUES (
                    @id, @customerId, @addressType, @label, @countryCode, @city, @region, @street, @postalCode, @isPrimary, @notes, @createdAt, @updatedAt
                )
                ON CONFLICT(id) DO UPDATE SET
                    customer_id = excluded.customer_id,
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
                FROM crm_customer_addresses
                WHERE customer_id = ?
                  AND UPPER(address_type) = UPPER(?)
                  AND is_primary = 1
                LIMIT 1
            `).get(input.customerId, input.addressType);
            if (!primaryRow?.id) {
                this.db.prepare(`
                    UPDATE crm_customer_addresses
                    SET is_primary = 1,
                        updated_at = ?
                    WHERE id = ?
                `).run(input.updatedAt, input.id);
            }
        });
        const row = this.db.prepare(`SELECT * FROM crm_customer_addresses WHERE id = ?`).get(input.id);
        return this.mapAddress(row);
    }
    getCustomerCreditProfile(customerId) {
        const row = this.db.prepare(`
            SELECT *
            FROM crm_customer_credit_profiles
            WHERE customer_id = ?
            LIMIT 1
        `).get(customerId);
        if (!row)
            return null;
        return this.mapCreditProfile(row);
    }
    saveCustomerCreditProfile(input) {
        this.db.prepare(`
            INSERT INTO crm_customer_credit_profiles (
                id, customer_id, credit_limit, overdue_limit, max_invoice_age_days,
                risk_level, requires_approval_on_hold, auto_hold_on_overdue, auto_hold_on_credit_limit,
                hold_reason, last_review_date, created_at, updated_at
            ) VALUES (
                @id, @customerId, @creditLimit, @overdueLimit, @maxInvoiceAgeDays,
                @riskLevel, @requiresApprovalOnHold, @autoHoldOnOverdue, @autoHoldOnCreditLimit,
                @holdReason, @lastReviewDate, @createdAt, @updatedAt
            )
            ON CONFLICT(customer_id) DO UPDATE SET
                credit_limit = excluded.credit_limit,
                overdue_limit = excluded.overdue_limit,
                max_invoice_age_days = excluded.max_invoice_age_days,
                risk_level = excluded.risk_level,
                requires_approval_on_hold = excluded.requires_approval_on_hold,
                auto_hold_on_overdue = excluded.auto_hold_on_overdue,
                auto_hold_on_credit_limit = excluded.auto_hold_on_credit_limit,
                hold_reason = excluded.hold_reason,
                last_review_date = excluded.last_review_date,
                updated_at = excluded.updated_at
        `).run({
            ...input,
            requiresApprovalOnHold: input.requiresApprovalOnHold ? 1 : 0,
            autoHoldOnOverdue: input.autoHoldOnOverdue ? 1 : 0,
            autoHoldOnCreditLimit: input.autoHoldOnCreditLimit ? 1 : 0,
        });
        return this.getCustomerCreditProfile(input.customerId);
    }
    listCustomerPriceProfiles(customerId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_customer_price_profiles
            WHERE customer_id = ?
            ORDER BY COALESCE(effective_from, ''), id
        `).all(customerId);
        return rows.map((row) => this.mapPriceProfile(row));
    }
    saveCustomerPriceProfile(input) {
        this.db.prepare(`
            INSERT INTO crm_customer_price_profiles (
                id, customer_id, price_list_id, discount_percent, effective_from, effective_to, notes, created_at, updated_at
            ) VALUES (
                @id, @customerId, @priceListId, @discountPercent, @effectiveFrom, @effectiveTo, @notes, @createdAt, @updatedAt
            )
            ON CONFLICT(id) DO UPDATE SET
                customer_id = excluded.customer_id,
                price_list_id = excluded.price_list_id,
                discount_percent = excluded.discount_percent,
                effective_from = excluded.effective_from,
                effective_to = excluded.effective_to,
                notes = excluded.notes,
                updated_at = excluded.updated_at
        `).run(input);
        const row = this.db.prepare(`SELECT * FROM crm_customer_price_profiles WHERE id = ?`).get(input.id);
        return this.mapPriceProfile(row);
    }
    createCustomerFollowUp(input) {
        this.db.prepare(`
            INSERT INTO crm_customer_follow_ups (
                id, company_id, customer_id, follow_up_date, follow_up_type, status,
                assigned_to, subject, note_text, promise_amount, promise_date,
                related_source_type, related_source_id, created_at, updated_at
            ) VALUES (
                @id, @companyId, @customerId, @followUpDate, @followUpType, @status,
                @assignedTo, @subject, @noteText, @promiseAmount, @promiseDate,
                @relatedSourceType, @relatedSourceId, @createdAt, @updatedAt
            )
        `).run(input);
        return this.getCustomerFollowUpById(input.companyId, input.id);
    }
    updateCustomerFollowUp(input) {
        this.db.prepare(`
            UPDATE crm_customer_follow_ups
            SET follow_up_date = @followUpDate,
                follow_up_type = @followUpType,
                assigned_to = @assignedTo,
                subject = @subject,
                note_text = @noteText,
                promise_amount = @promiseAmount,
                promise_date = @promiseDate,
                related_source_type = @relatedSourceType,
                related_source_id = @relatedSourceId,
                updated_at = @updatedAt
            WHERE id = @id
              AND company_id = @companyId
              AND customer_id = @customerId
        `).run(input);
        return this.getCustomerFollowUpById(input.companyId, input.id);
    }
    getCustomerFollowUpById(companyId, followUpId) {
        const row = this.db.prepare(`
            SELECT *
            FROM crm_customer_follow_ups
            WHERE company_id = ?
              AND id = ?
            LIMIT 1
        `).get(companyId, followUpId);
        if (!row)
            return null;
        return this.mapFollowUp(row);
    }
    listCustomerFollowUps(companyId, customerId, includeClosed) {
        const rows = this.db.prepare(`
            SELECT *
            FROM crm_customer_follow_ups
            WHERE company_id = ?
              AND customer_id = ?
              AND (? = 1 OR UPPER(COALESCE(status, 'OPEN')) = 'OPEN')
            ORDER BY follow_up_date DESC, updated_at DESC, id DESC
        `).all(companyId, customerId, includeClosed ? 1 : 0);
        return rows.map((row) => this.mapFollowUp(row));
    }
    setCustomerFollowUpStatus(input) {
        this.db.prepare(`
            UPDATE crm_customer_follow_ups
            SET status = @status,
                note_text = @noteText,
                updated_at = @updatedAt
            WHERE id = @id
              AND company_id = @companyId
              AND customer_id = @customerId
        `).run(input);
        return this.getCustomerFollowUpById(input.companyId, input.id);
    }
    saveCustomerHoldLog(input) {
        this.db.prepare(`
            INSERT INTO crm_customer_hold_logs (
                id, company_id, customer_id, action_type, reason, manual, created_by, created_at
            ) VALUES (
                @id, @companyId, @customerId, @actionType, @reason, @manual, @createdBy, @createdAt
            )
        `).run({
            ...input,
            manual: input.manual ? 1 : 0,
        });
    }
    getReceivableJournalBalance(companyId, customerId, asOfDate, branchId) {
        if (!this.tableExists('journals') || !this.tableExists('journal_lines'))
            return 0;
        const row = this.db.prepare(`
            SELECT COALESCE(SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0)), 0) AS balance
            FROM journal_lines l
            JOIN journals j ON j.id = l.journal_id
            WHERE j.company_id = ?
              AND l.partner_id = ?
              AND UPPER(COALESCE(j.status, 'POSTED')) = 'POSTED'
              AND COALESCE(j.journal_date, SUBSTR(COALESCE(j.posted_at, CURRENT_TIMESTAMP), 1, 10)) <= ?
              AND (? IS NULL OR COALESCE(j.branch_id, '') = ?)
        `).get(companyId, customerId, asOfDate, branchId, branchId);
        return this.round(Number(row?.balance || 0));
    }
    listOpenSalesInvoices(companyId, customerId, asOfDate, branchId) {
        if (!this.tableExists('sales_invoices'))
            return [];
        const cols = this.getTableColumns('sales_invoices');
        const dateExpr = this.pickColumnExpr('si', cols, ['doc_date', 'date'], `SUBSTR(COALESCE(si.created_at, CURRENT_TIMESTAMP), 1, 10)`);
        const dueExpr = this.pickColumnExpr('si', cols, ['due_date', 'doc_date', 'date'], dateExpr);
        const noExpr = this.pickColumnExpr('si', cols, ['invoice_no'], 'si.id');
        const paymentStatusExpr = this.pickColumnExpr('si', cols, ['payment_status'], `'UNPAID'`);
        const totalExpr = this.pickColumnExpr('si', cols, ['grand_total', 'total_amount', 'net_total', 'subtotal'], '0');
        const paidExpr = this.pickColumnExpr('si', cols, ['paid_amount', 'amount_paid', 'collected_amount'], '0');
        const statusExpr = this.pickColumnExpr('si', cols, ['status'], `'POSTED'`);
        const companyExpr = this.pickColumnExpr('si', cols, ['company_id'], `'COMP_01'`);
        const branchExpr = this.pickColumnExpr('si', cols, ['branch_id'], `''`);
        const customerExpr = this.pickColumnExpr('si', cols, ['customer_id'], `''`);
        const rows = this.db.prepare(`
            SELECT
                si.id AS source_id,
                ${noExpr} AS source_no,
                ${dateExpr} AS doc_date,
                ${dueExpr} AS due_date,
                ${paymentStatusExpr} AS payment_status,
                CASE
                    WHEN (${totalExpr} - ${paidExpr}) > 0 THEN (${totalExpr} - ${paidExpr})
                    ELSE ${totalExpr}
                END AS amount
            FROM sales_invoices si
            WHERE COALESCE(${companyExpr}, 'COMP_01') = ?
              AND COALESCE(${customerExpr}, '') = ?
              AND UPPER(COALESCE(${statusExpr}, 'POSTED')) NOT IN ('DRAFT', 'VOID', 'CANCELLED')
              AND COALESCE(${dateExpr}, '') <= ?
              AND (? IS NULL OR COALESCE(${branchExpr}, '') = ?)
              AND UPPER(COALESCE(${paymentStatusExpr}, 'UNPAID')) <> 'PAID'
            ORDER BY ${dateExpr}, si.id
        `).all(companyId, customerId, asOfDate, branchId, branchId);
        return rows
            .map((row) => ({
            sourceType: 'SALES_INVOICE',
            sourceId: row.source_id,
            sourceNo: String(row.source_no || row.source_id || ''),
            docDate: String(row.doc_date || '').slice(0, 10),
            dueDate: String(row.due_date || row.doc_date || '').slice(0, 10),
            paymentStatus: String(row.payment_status || 'UNPAID').toUpperCase(),
            amount: this.round(Math.max(Number(row.amount || 0), 0)),
        }))
            .filter((row) => row.docDate && row.amount > 0);
    }
    sumOpenSalesOrders(companyId, customerId, asOfDate, branchId) {
        if (!this.tableExists('sales_operation_documents'))
            return 0;
        const row = this.db.prepare(`
            SELECT COALESCE(SUM(COALESCE(total_amount, 0)), 0) AS amount
            FROM sales_operation_documents
            WHERE company_id = ?
              AND customer_id = ?
              AND UPPER(COALESCE(doc_type, '')) = 'SALES_ORDER'
              AND UPPER(COALESCE(status, 'DRAFT')) NOT IN ('COMPLETED', 'CANCELLED')
              AND COALESCE(doc_date, '') <= ?
              AND (? IS NULL OR COALESCE(branch_id, '') = ?)
        `).get(companyId, customerId, asOfDate, branchId, branchId);
        return this.round(Number(row?.amount || 0));
    }
    getChequeExposure(companyId, customerId, asOfDate, branchId) {
        if (this.tableExists('cheque_register')) {
            const row = this.db.prepare(`
                SELECT
                    COALESCE(SUM(CASE
                        WHEN UPPER(COALESCE(status, '')) IN ('IN_SAFE', 'DEPOSITED') THEN COALESCE(amount, 0)
                        ELSE 0
                    END), 0) AS undeposited_amount,
                    COALESCE(SUM(CASE
                        WHEN UPPER(COALESCE(status, '')) = 'RETURNED' THEN COALESCE(amount, 0)
                        ELSE 0
                    END), 0) AS returned_amount
                FROM cheque_register
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(partner_id, '') = ?
                  AND UPPER(COALESCE(direction, 'RECEIVED')) = 'RECEIVED'
                  AND COALESCE(COALESCE(due_date, cheque_date), '') <= ?
                  AND (? IS NULL OR COALESCE(branch_id, '') = ?)
            `).get(companyId, customerId, asOfDate, branchId, branchId);
            return {
                undepositedAmount: this.round(Number(row?.undeposited_amount || 0)),
                returnedAmount: this.round(Number(row?.returned_amount || 0)),
            };
        }
        if (this.tableExists('cheques')) {
            const row = this.db.prepare(`
                SELECT
                    COALESCE(SUM(CASE
                        WHEN UPPER(COALESCE(status, '')) IN ('ON_HAND', 'UNDER_COLLECTION', 'ENDORSED') THEN COALESCE(amount, 0)
                        ELSE 0
                    END), 0) AS undeposited_amount,
                    COALESCE(SUM(CASE
                        WHEN UPPER(COALESCE(status, '')) = 'BOUNCED' THEN COALESCE(amount, 0)
                        ELSE 0
                    END), 0) AS returned_amount
                FROM cheques
                WHERE COALESCE(partner_id, '') = ?
                  AND UPPER(COALESCE(type, 'INCOMING')) = 'INCOMING'
                  AND COALESCE(due_date, '') <= ?
            `).get(customerId, asOfDate);
            return {
                undepositedAmount: this.round(Number(row?.undeposited_amount || 0)),
                returnedAmount: this.round(Number(row?.returned_amount || 0)),
            };
        }
        return { undepositedAmount: 0, returnedAmount: 0 };
    }
    listStatementRows(query) {
        if (!this.tableExists('journals') || !this.tableExists('journal_lines'))
            return [];
        const hasSalesInvoices = this.tableExists('sales_invoices');
        const salesCols = hasSalesInvoices ? this.getTableColumns('sales_invoices') : new Set();
        const joinInvoice = hasSalesInvoices ? 'LEFT JOIN sales_invoices si ON si.id = j.source_id' : '';
        const dueExpr = hasSalesInvoices
            ? this.pickColumnExpr('si', salesCols, ['due_date', 'doc_date', 'date'], `NULL`)
            : 'NULL';
        const paymentStatusExpr = hasSalesInvoices
            ? this.pickColumnExpr('si', salesCols, ['payment_status'], `'UNPAID'`)
            : `'UNPAID'`;
        const rows = this.db.prepare(`
            SELECT
                l.id AS id,
                l.partner_id AS customer_id,
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
                  UPPER(COALESCE(j.source_type, '')) = 'SALES_INVOICE'
                  AND UPPER(COALESCE(${paymentStatusExpr}, 'UNPAID')) <> 'PAID'
              ))
            ORDER BY event_date, line_no, l.id
        `).all(query.companyId, query.customerId, query.branchId, query.branchId, query.fromDate, query.fromDate, query.toDate, query.toDate, query.includeOpenOnly ? 1 : 0);
        return rows.map((row) => ({
            id: row.id,
            customerId: row.customer_id,
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
    listTimelineRows(query) {
        const events = [];
        if (this.tableExists('sales_operation_documents')) {
            const rows = this.db.prepare(`
                SELECT
                    id,
                    customer_id,
                    doc_date AS event_date,
                    doc_type AS event_type,
                    doc_type AS source_type,
                    id AS source_id,
                    doc_no AS source_no,
                    COALESCE(doc_type, 'SALES_EVENT') AS title,
                    NULLIF(TRIM(COALESCE(remarks, '')), '') AS details,
                    status,
                    COALESCE(total_amount, 0) AS amount,
                    created_by
                FROM sales_operation_documents
                WHERE company_id = ?
                  AND customer_id = ?
                  AND (? IS NULL OR doc_date >= ?)
                  AND (? IS NULL OR doc_date <= ?)
            `).all(query.companyId, query.customerId, query.fromDate, query.fromDate, query.toDate, query.toDate);
            for (const row of rows) {
                events.push(this.toTimelineEvent(row));
            }
        }
        if (this.tableExists('sales_invoices')) {
            const cols = this.getTableColumns('sales_invoices');
            const dateExpr = this.pickColumnExpr('si', cols, ['doc_date', 'date'], `SUBSTR(COALESCE(si.created_at, CURRENT_TIMESTAMP), 1, 10)`);
            const noExpr = this.pickColumnExpr('si', cols, ['invoice_no'], 'si.id');
            const statusExpr = this.pickColumnExpr('si', cols, ['status'], `'POSTED'`);
            const amountExpr = this.pickColumnExpr('si', cols, ['grand_total', 'total_amount', 'net_total', 'subtotal'], '0');
            const companyExpr = this.pickColumnExpr('si', cols, ['company_id'], `'COMP_01'`);
            const customerExpr = this.pickColumnExpr('si', cols, ['customer_id'], `''`);
            const createdByExpr = this.pickColumnExpr('si', cols, ['created_by'], `NULL`);
            const remarksExpr = this.pickColumnExpr('si', cols, ['remarks', 'notes'], `NULL`);
            const rows = this.db.prepare(`
                SELECT
                    si.id AS id,
                    ${customerExpr} AS customer_id,
                    ${dateExpr} AS event_date,
                    'SALES_INVOICE' AS event_type,
                    'SALES_INVOICE' AS source_type,
                    si.id AS source_id,
                    ${noExpr} AS source_no,
                    'SALES_INVOICE' AS title,
                    ${remarksExpr} AS details,
                    ${statusExpr} AS status,
                    ${amountExpr} AS amount,
                    ${createdByExpr} AS created_by
                FROM sales_invoices si
                WHERE COALESCE(${companyExpr}, 'COMP_01') = ?
                  AND COALESCE(${customerExpr}, '') = ?
                  AND (? IS NULL OR ${dateExpr} >= ?)
                  AND (? IS NULL OR ${dateExpr} <= ?)
            `).all(query.companyId, query.customerId, query.fromDate, query.fromDate, query.toDate, query.toDate);
            for (const row of rows) {
                events.push(this.toTimelineEvent(row));
            }
        }
        if (this.tableExists('treasury_documents')) {
            const rows = this.db.prepare(`
                SELECT
                    id,
                    partner_id AS customer_id,
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
            `).all(query.companyId, query.customerId, query.fromDate, query.fromDate, query.toDate, query.toDate);
            for (const row of rows) {
                events.push(this.toTimelineEvent(row));
            }
        }
        if (this.tableExists('cheque_register')) {
            const rows = this.db.prepare(`
                SELECT
                    id,
                    partner_id AS customer_id,
                    COALESCE(due_date, cheque_date) AS event_date,
                    'CHEQUE' AS event_type,
                    'CHEQUE_RECEIPT' AS source_type,
                    id AS source_id,
                    cheque_no AS source_no,
                    'CHEQUE_RECEIPT' AS title,
                    NULL AS details,
                    status,
                    amount,
                    NULL AS created_by
                FROM cheque_register
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND partner_id = ?
                  AND UPPER(COALESCE(direction, 'RECEIVED')) = 'RECEIVED'
                  AND (? IS NULL OR COALESCE(due_date, cheque_date) >= ?)
                  AND (? IS NULL OR COALESCE(due_date, cheque_date) <= ?)
            `).all(query.companyId, query.customerId, query.fromDate, query.fromDate, query.toDate, query.toDate);
            for (const row of rows) {
                events.push(this.toTimelineEvent(row));
            }
        }
        const followUpRows = this.db.prepare(`
            SELECT
                id,
                customer_id,
                follow_up_date AS event_date,
                'COLLECTION_FOLLOW_UP' AS event_type,
                'COLLECTION_FOLLOW_UP' AS source_type,
                id AS source_id,
                NULL AS source_no,
                COALESCE(subject, follow_up_type, 'FOLLOW_UP') AS title,
                note_text AS details,
                status,
                promise_amount AS amount,
                assigned_to AS created_by
            FROM crm_customer_follow_ups
            WHERE company_id = ?
              AND customer_id = ?
              AND (? IS NULL OR follow_up_date >= ?)
              AND (? IS NULL OR follow_up_date <= ?)
        `).all(query.companyId, query.customerId, query.fromDate, query.fromDate, query.toDate, query.toDate);
        for (const row of followUpRows) {
            events.push(this.toTimelineEvent(row));
        }
        return events
            .filter((row) => row.eventDate)
            .sort((a, b) => {
            if (a.eventDate !== b.eventDate)
                return b.eventDate.localeCompare(a.eventDate);
            return b.id.localeCompare(a.id);
        })
            .slice(0, Math.max(1, Math.min(query.limit, 1000)));
    }
    getPolicy(companyId) {
        return {
            includeOpenOrdersInExposure: this.readBooleanSetting(companyId, [
                'crm.include_open_orders_in_exposure',
                'receivables.include_open_orders',
            ], false),
            includeUndepositedChequesInExposure: this.readBooleanSetting(companyId, [
                'crm.include_undeposited_cheques_in_exposure',
                'receivables.include_undeposited_cheques',
            ], true),
            includeReturnedChequesInExposure: this.readBooleanSetting(companyId, [
                'crm.include_returned_cheques_in_exposure',
                'receivables.include_returned_cheques',
            ], true),
        };
    }
    readBooleanSetting(companyId, keys, fallback) {
        if (!this.tableExists('settings') || !keys.length)
            return fallback;
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
        `).get(...keys);
        const normalized = String(row?.value ?? '').trim().toUpperCase();
        if (!normalized)
            return fallback;
        if (normalized === '0' || normalized === 'FALSE' || normalized === 'NO' || normalized === 'OFF' || normalized === 'DISABLED') {
            return false;
        }
        return TRUE_VALUES.has(normalized);
    }
    syncBusinessPartnerFromCustomer(companyId, customerId) {
        if (!this.tableExists('business_partners'))
            return;
        const customer = this.getCustomerById(companyId, customerId);
        if (!customer)
            return;
        const row = this.db.prepare(`
            SELECT id, type, created_at
            FROM business_partners
            WHERE id = ?
            LIMIT 1
        `).get(customerId);
        const partnerType = this.normalizePartnerType(row?.type || null);
        const paymentTermDays = this.resolvePaymentTermDays(customer.paymentTermsId);
        if (!row?.id) {
            this.db.prepare(`
                INSERT INTO business_partners (
                    id, code, name_ar, name_en, type, phone, mobile, email, city, tax_number,
                    linked_account_id, credit_limit, payment_term_days, price_list_id, is_active, created_at,
                    customer_enabled, customer_code, customer_name_ar, customer_name_en, customer_currency_id, customer_account_id, sales_rep_id
                ) VALUES (
                    @id, @code, @nameAr, @nameEn, @type, @phone, @mobile, @email, NULL, @taxNo,
                    @linkedAccountId, @creditLimit, @paymentTermDays, @priceListId, @isActive, @createdAt,
                    1, @customerCode, @customerNameAr, @customerNameEn, @customerCurrencyId, @customerAccountId, @salesRepId
                )
            `).run({
                id: customer.id,
                code: customer.code,
                nameAr: customer.nameAr || customer.name,
                nameEn: customer.name,
                type: partnerType,
                phone: customer.phone,
                mobile: customer.mobile,
                email: customer.email,
                taxNo: customer.taxNo,
                linkedAccountId: customer.receivableAccountId,
                creditLimit: this.getCustomerCreditProfile(customer.id)?.creditLimit || 0,
                paymentTermDays,
                priceListId: customer.priceListId,
                isActive: customer.isActive ? 1 : 0,
                createdAt: customer.createdAt,
                customerCode: customer.code,
                customerNameAr: customer.nameAr || customer.name,
                customerNameEn: customer.name,
                customerCurrencyId: customer.currencyCode,
                customerAccountId: customer.receivableAccountId,
                salesRepId: customer.salesPersonId,
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
                customer_enabled = 1,
                customer_code = ?,
                customer_name_ar = ?,
                customer_name_en = ?,
                customer_currency_id = ?,
                customer_account_id = ?,
                sales_rep_id = ?
            WHERE id = ?
        `).run(customer.code, customer.nameAr || customer.name, customer.name, partnerType, customer.phone, customer.mobile, customer.email, customer.taxNo, customer.receivableAccountId, paymentTermDays, customer.priceListId, customer.isActive ? 1 : 0, customer.code, customer.nameAr || customer.name, customer.name, customer.currencyCode, customer.receivableAccountId, customer.salesPersonId, customer.id);
    }
    resolvePaymentTermDays(paymentTermsId) {
        if (!paymentTermsId || !this.tableExists('payment_terms'))
            return 0;
        const row = this.db.prepare(`
            SELECT days
            FROM payment_terms
            WHERE id = ?
            LIMIT 1
        `).get(paymentTermsId);
        return Number(row?.days || 0);
    }
    normalizePartnerType(value) {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'BOTH' || normalized === 'CUSTOMER')
            return normalized;
        if (normalized === 'SUPPLIER')
            return 'BOTH';
        return 'CUSTOMER';
    }
    pickColumnExpr(alias, columns, preferred, fallbackSql) {
        for (const column of preferred) {
            if (columns.has(column.toLowerCase())) {
                return `${alias}.${column}`;
            }
        }
        return fallbackSql;
    }
    toTimelineEvent(row) {
        return {
            id: row.id,
            customerId: row.customer_id,
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
    mapCustomer(row) {
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
            status: String(row.status || 'ACTIVE').toUpperCase(),
            currencyCode: row.currency_code || null,
            paymentTermsId: row.payment_terms_id || null,
            receivableAccountId: row.receivable_account_id || null,
            priceListId: row.price_list_id || null,
            salesPersonId: row.sales_person_id || null,
            territoryId: row.territory_id || null,
            creditHold: Number(row.credit_hold || 0) === 1,
            isActive: Number(row.is_active ?? 1) === 1,
            remarks: row.remarks || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }
    mapContact(row) {
        return {
            id: row.id,
            customerId: row.customer_id,
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
    mapAddress(row) {
        return {
            id: row.id,
            customerId: row.customer_id,
            addressType: String(row.address_type || 'OTHER').toUpperCase(),
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
    mapCreditProfile(row) {
        return {
            id: row.id,
            customerId: row.customer_id,
            creditLimit: this.round(Number(row.credit_limit || 0)),
            overdueLimit: this.round(Number(row.overdue_limit || 0)),
            maxInvoiceAgeDays: row.max_invoice_age_days == null ? null : Number(row.max_invoice_age_days),
            riskLevel: String(row.risk_level || 'MEDIUM').toUpperCase(),
            requiresApprovalOnHold: Number(row.requires_approval_on_hold ?? 1) === 1,
            autoHoldOnOverdue: Number(row.auto_hold_on_overdue ?? 1) === 1,
            autoHoldOnCreditLimit: Number(row.auto_hold_on_credit_limit ?? 1) === 1,
            holdReason: row.hold_reason || null,
            lastReviewDate: row.last_review_date || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }
    mapPriceProfile(row) {
        return {
            id: row.id,
            customerId: row.customer_id,
            priceListId: String(row.price_list_id || ''),
            discountPercent: this.round(Number(row.discount_percent || 0)),
            effectiveFrom: row.effective_from || null,
            effectiveTo: row.effective_to || null,
            notes: row.notes || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }
    mapFollowUp(row) {
        return {
            id: row.id,
            companyId: String(row.company_id || 'COMP_01'),
            customerId: String(row.customer_id || ''),
            followUpDate: String(row.follow_up_date || ''),
            followUpType: String(row.follow_up_type || 'CALL').toUpperCase(),
            status: String(row.status || 'OPEN').toUpperCase(),
            assignedTo: row.assigned_to || null,
            subject: row.subject || null,
            noteText: row.note_text || null,
            promiseAmount: row.promise_amount == null ? null : this.round(Number(row.promise_amount || 0)),
            promiseDate: row.promise_date || null,
            relatedSourceType: row.related_source_type || null,
            relatedSourceId: row.related_source_id || null,
            createdAt: String(row.created_at || new Date().toISOString()),
            updatedAt: String(row.updated_at || new Date().toISOString()),
        };
    }
    round(value) {
        return Math.round((Number(value) + Number.EPSILON) * 1000000) / 1000000;
    }
}
exports.SqliteCustomerReceivablesRepo = SqliteCustomerReceivablesRepo;
