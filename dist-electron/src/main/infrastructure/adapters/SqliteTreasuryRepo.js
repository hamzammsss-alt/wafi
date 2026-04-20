"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteTreasuryRepo = void 0;
const uuid_1 = require("uuid");
const errors_1 = require("../../domain/errors");
class SqliteTreasuryRepo {
    constructor(db) {
        this.db = db;
    }
    ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS treasury_documents (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                doc_no TEXT NOT NULL,
                doc_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                partner_id TEXT,
                cash_account_id TEXT,
                bank_account_id TEXT,
                currency_code TEXT NOT NULL DEFAULT 'ILS',
                currency_rate REAL NOT NULL DEFAULT 1,
                reference_no TEXT,
                remarks TEXT,
                created_by TEXT NOT NULL,
                approved_by TEXT,
                version INTEGER NOT NULL DEFAULT 1,
                journal_id TEXT,
                reversal_journal_id TEXT,
                posted_at TEXT,
                posted_by TEXT,
                reversed_at TEXT,
                reversed_by TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS treasury_document_lines (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                line_no INTEGER NOT NULL,
                account_id TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0,
                description TEXT,
                cost_center_id TEXT,
                project_id TEXT,
                expense_type_id TEXT,
                vehicle_id TEXT,
                partner_id TEXT,
                item_id TEXT,
                warehouse_id TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES treasury_documents(id) ON DELETE CASCADE
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cheque_register (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                cheque_no TEXT NOT NULL,
                cheque_date TEXT NOT NULL,
                due_date TEXT,
                amount REAL NOT NULL DEFAULT 0,
                currency_code TEXT NOT NULL DEFAULT 'ILS',
                currency_rate REAL NOT NULL DEFAULT 1,
                bank_name TEXT,
                drawer_name TEXT,
                payee_name TEXT,
                partner_id TEXT,
                status TEXT NOT NULL,
                direction TEXT NOT NULL,
                treasury_document_id TEXT,
                deposited_bank_account_id TEXT,
                cleared_date TEXT,
                returned_date TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (treasury_document_id) REFERENCES treasury_documents(id)
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cheque_event_registry (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                cheque_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_date TEXT NOT NULL,
                journal_id TEXT,
                source_type TEXT NOT NULL,
                source_version INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cheque_id) REFERENCES cheque_register(id)
            )
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_treasury_documents_scope_status_date
                ON treasury_documents(company_id, branch_id, status, doc_date, id)
        `);
        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_treasury_documents_doc_no_scope
                ON treasury_documents(company_id, COALESCE(branch_id, ''), doc_type, doc_no)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_treasury_document_lines_document
                ON treasury_document_lines(document_id, line_no)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_treasury_document_lines_account
                ON treasury_document_lines(account_id)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_cheque_register_company_direction_no
                ON cheque_register(company_id, direction, cheque_no)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_cheque_register_document
                ON cheque_register(treasury_document_id)
        `);
        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_cheque_event_registry_scope
                ON cheque_event_registry(company_id, cheque_id, event_type)
        `);
    }
    nextIdentity() {
        return (0, uuid_1.v4)();
    }
    nextDocumentNo(companyId, branchId, docType) {
        const normalizedDocType = this.normalizeDocType(docType);
        const sequenceKey = `treasury_${normalizedDocType.toLowerCase()}`;
        this.db.prepare(`
            INSERT OR IGNORE INTO doc_sequences(doc_type, next_no)
            VALUES(?, 1)
        `).run(sequenceKey);
        const row = this.db.prepare(`
            SELECT next_no
            FROM doc_sequences
            WHERE doc_type = ?
            LIMIT 1
        `).get(sequenceKey);
        const nextNo = Math.max(Number(row?.next_no || 1), 1);
        this.db.prepare(`
            UPDATE doc_sequences
            SET next_no = next_no + 1
            WHERE doc_type = ?
        `).run(sequenceKey);
        return `${this.getDocTypePrefix(normalizedDocType)}-${String(nextNo).padStart(5, '0')}`;
    }
    runInTransaction(work) {
        const tx = this.db.transaction(() => work());
        return tx();
    }
    createDocument(input) {
        this.db.prepare(`
            INSERT INTO treasury_documents (
                id, company_id, branch_id, doc_type, doc_no, doc_date, status,
                partner_id, cash_account_id, bank_account_id,
                currency_code, currency_rate, reference_no, remarks,
                created_by, approved_by, version, created_at, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @docType, @docNo, @docDate, @status,
                @partnerId, @cashAccountId, @bankAccountId,
                @currencyCode, @currencyRate, @referenceNo, @remarks,
                @createdBy, @approvedBy, @version, @createdAt, @updatedAt
            )
        `).run(input);
        const insertLine = this.db.prepare(`
            INSERT INTO treasury_document_lines (
                id, document_id, line_no, account_id, amount, description,
                cost_center_id, project_id, expense_type_id, vehicle_id,
                partner_id, item_id, warehouse_id, created_at, updated_at
            ) VALUES (
                @id, @documentId, @lineNo, @accountId, @amount, @description,
                @costCenterId, @projectId, @expenseTypeId, @vehicleId,
                @partnerId, @itemId, @warehouseId, @createdAt, @updatedAt
            )
        `);
        for (const line of input.lines) {
            insertLine.run(line);
        }
        const document = this.getDocumentById(input.companyId, input.branchId, input.id);
        if (!document) {
            throw new errors_1.DomainError('INTERNAL_ERROR', `Treasury document ${input.id} was not found after create`);
        }
        return document;
    }
    updateDocument(input) {
        const info = this.db.prepare(`
            UPDATE treasury_documents
            SET doc_date = @docDate,
                partner_id = @partnerId,
                cash_account_id = @cashAccountId,
                bank_account_id = @bankAccountId,
                currency_code = @currencyCode,
                currency_rate = @currencyRate,
                reference_no = @referenceNo,
                remarks = @remarks,
                approved_by = @approvedBy,
                version = COALESCE(version, 1) + 1,
                updated_at = @updatedAt
            WHERE id = @id
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
              AND UPPER(COALESCE(status, 'DRAFT')) = 'DRAFT'
        `).run(input);
        if (Number(info.changes || 0) === 0) {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Only draft treasury documents can be updated', {
                messageKey: 'error.treasury_document.update.not_draft',
                details: { documentId: input.id },
            });
        }
        this.db.prepare(`DELETE FROM treasury_document_lines WHERE document_id = ?`).run(input.id);
        const insertLine = this.db.prepare(`
            INSERT INTO treasury_document_lines (
                id, document_id, line_no, account_id, amount, description,
                cost_center_id, project_id, expense_type_id, vehicle_id,
                partner_id, item_id, warehouse_id, created_at, updated_at
            ) VALUES (
                @id, @documentId, @lineNo, @accountId, @amount, @description,
                @costCenterId, @projectId, @expenseTypeId, @vehicleId,
                @partnerId, @itemId, @warehouseId, @createdAt, @updatedAt
            )
        `);
        for (const line of input.lines) {
            insertLine.run(line);
        }
        const document = this.getDocumentById(input.companyId, input.branchId, input.id);
        if (!document) {
            throw new errors_1.DomainError('INTERNAL_ERROR', `Treasury document ${input.id} was not found after update`);
        }
        return document;
    }
    getDocumentById(companyId, branchId, documentId) {
        const header = this.getDocumentHeaderById(companyId, branchId, documentId);
        if (!header)
            return null;
        return {
            header,
            lines: this.getDocumentLinesByDocumentId(documentId),
            cheque: this.getChequeByDocumentId(companyId, documentId),
        };
    }
    getDocumentHeaderById(companyId, branchId, documentId) {
        const row = this.db.prepare(`
            SELECT
                id,
                COALESCE(company_id, 'COMP_01') AS company_id,
                COALESCE(branch_id, '') AS branch_id,
                COALESCE(doc_type, 'CASH_RECEIPT') AS doc_type,
                COALESCE(doc_no, '') AS doc_no,
                COALESCE(doc_date, '') AS doc_date,
                COALESCE(status, 'DRAFT') AS status,
                NULLIF(TRIM(COALESCE(partner_id, '')), '') AS partner_id,
                NULLIF(TRIM(COALESCE(cash_account_id, '')), '') AS cash_account_id,
                NULLIF(TRIM(COALESCE(bank_account_id, '')), '') AS bank_account_id,
                COALESCE(currency_code, 'ILS') AS currency_code,
                COALESCE(currency_rate, 1) AS currency_rate,
                NULLIF(TRIM(COALESCE(reference_no, '')), '') AS reference_no,
                NULLIF(TRIM(COALESCE(remarks, '')), '') AS remarks,
                COALESCE(created_by, 'SYSTEM') AS created_by,
                NULLIF(TRIM(COALESCE(approved_by, '')), '') AS approved_by,
                COALESCE(version, 1) AS version,
                NULLIF(TRIM(COALESCE(journal_id, '')), '') AS journal_id,
                NULLIF(TRIM(COALESCE(reversal_journal_id, '')), '') AS reversal_journal_id,
                NULLIF(TRIM(COALESCE(posted_at, '')), '') AS posted_at,
                NULLIF(TRIM(COALESCE(posted_by, '')), '') AS posted_by,
                NULLIF(TRIM(COALESCE(reversed_at, '')), '') AS reversed_at,
                NULLIF(TRIM(COALESCE(reversed_by, '')), '') AS reversed_by,
                COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at,
                COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS updated_at
            FROM treasury_documents
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
            LIMIT 1
        `).get(documentId, companyId, branchId);
        if (!row)
            return null;
        return {
            id: row.id,
            companyId: String(row.company_id || 'COMP_01'),
            branchId: String(row.branch_id || ''),
            docType: this.normalizeDocType(row.doc_type),
            docNo: String(row.doc_no || ''),
            docDate: String(row.doc_date || ''),
            status: this.normalizeStatus(row.status),
            partnerId: row.partner_id || null,
            cashAccountId: row.cash_account_id || null,
            bankAccountId: row.bank_account_id || null,
            currencyCode: String(row.currency_code || 'ILS').trim().toUpperCase(),
            currencyRate: Number(row.currency_rate || 1),
            referenceNo: row.reference_no || null,
            remarks: row.remarks || null,
            createdBy: String(row.created_by || 'SYSTEM'),
            approvedBy: row.approved_by || null,
            version: Number(row.version || 1),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            postedAt: row.posted_at || null,
            postedBy: row.posted_by || null,
            reversedAt: row.reversed_at || null,
            reversedBy: row.reversed_by || null,
            createdAt: String(row.created_at || ''),
            updatedAt: String(row.updated_at || ''),
        };
    }
    getDocumentLinesByDocumentId(documentId) {
        const rows = this.db.prepare(`
            SELECT
                id,
                document_id,
                COALESCE(line_no, rowid) AS line_no,
                COALESCE(account_id, '') AS account_id,
                COALESCE(amount, 0) AS amount,
                NULLIF(TRIM(COALESCE(description, '')), '') AS description,
                NULLIF(TRIM(COALESCE(cost_center_id, '')), '') AS cost_center_id,
                NULLIF(TRIM(COALESCE(project_id, '')), '') AS project_id,
                NULLIF(TRIM(COALESCE(expense_type_id, '')), '') AS expense_type_id,
                NULLIF(TRIM(COALESCE(vehicle_id, '')), '') AS vehicle_id,
                NULLIF(TRIM(COALESCE(partner_id, '')), '') AS partner_id,
                NULLIF(TRIM(COALESCE(item_id, '')), '') AS item_id,
                NULLIF(TRIM(COALESCE(warehouse_id, '')), '') AS warehouse_id,
                COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at,
                COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS updated_at
            FROM treasury_document_lines
            WHERE document_id = ?
            ORDER BY COALESCE(line_no, rowid)
        `).all(documentId);
        return rows.map((row) => ({
            id: row.id,
            documentId: row.document_id,
            lineNo: Number(row.line_no || 0),
            accountId: String(row.account_id || ''),
            amount: Number(row.amount || 0),
            description: row.description || null,
            costCenterId: row.cost_center_id || null,
            projectId: row.project_id || null,
            expenseTypeId: row.expense_type_id || null,
            vehicleId: row.vehicle_id || null,
            partnerId: row.partner_id || null,
            itemId: row.item_id || null,
            warehouseId: row.warehouse_id || null,
            createdAt: String(row.created_at || ''),
            updatedAt: String(row.updated_at || ''),
        }));
    }
    getPartnerById(partnerId) {
        const row = this.db.prepare(`
            SELECT id
            FROM business_partners
            WHERE id = ?
            LIMIT 1
        `).get(partnerId);
        if (!row)
            return null;
        return {
            id: row.id,
            isActive: true,
        };
    }
    getAccountPostingState(companyId, accountId) {
        const row = this.db.prepare(`
            SELECT
                id,
                COALESCE(code, account_code, '') AS code,
                COALESCE(name, '') AS name,
                COALESCE(is_active, 1) AS is_active,
                is_posting,
                posting_allowed,
                is_transactional
            FROM accounts
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
            LIMIT 1
        `).get(accountId, companyId);
        if (!row) {
            return {
                accountId,
                exists: false,
                isActive: false,
                isPosting: false,
                accountCode: null,
                accountName: null,
            };
        }
        const isPosting = row.is_posting !== null && row.is_posting !== undefined
            ? Number(row.is_posting) === 1
            : row.posting_allowed !== null && row.posting_allowed !== undefined
                ? Number(row.posting_allowed) === 1
                : row.is_transactional !== null && row.is_transactional !== undefined
                    ? Number(row.is_transactional) === 1
                    : true;
        return {
            accountId: row.id,
            exists: true,
            isActive: Number(row.is_active ?? 1) === 1,
            isPosting,
            accountCode: String(row.code || '').trim() || null,
            accountName: String(row.name || '').trim() || null,
        };
    }
    resolveCurrencyCode(rawCurrencyCode) {
        const normalized = String(rawCurrencyCode || '').trim();
        if (!normalized)
            return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized))
            return normalized.toUpperCase();
        const row = this.db.prepare(`
            SELECT code
            FROM currencies
            WHERE id = ? OR UPPER(code) = UPPER(?)
            LIMIT 1
        `).get(normalized, normalized);
        return String(row?.code || 'ILS').trim().toUpperCase() || 'ILS';
    }
    getPostingState(companyId, branchId, documentId) {
        const row = this.db.prepare(`
            SELECT
                id,
                COALESCE(status, 'DRAFT') AS status,
                COALESCE(version, 1) AS version,
                NULLIF(TRIM(COALESCE(journal_id, '')), '') AS journal_id,
                NULLIF(TRIM(COALESCE(reversal_journal_id, '')), '') AS reversal_journal_id,
                NULLIF(TRIM(COALESCE(posted_at, '')), '') AS posted_at,
                NULLIF(TRIM(COALESCE(reversed_at, '')), '') AS reversed_at
            FROM treasury_documents
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
            LIMIT 1
        `).get(documentId, companyId, branchId);
        if (!row)
            return null;
        return {
            documentId: row.id,
            status: String(row.status || 'DRAFT'),
            version: Number(row.version || 1),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            postedAt: row.posted_at || null,
            reversedAt: row.reversed_at || null,
        };
    }
    savePostingState(input) {
        this.db.prepare(`
            UPDATE treasury_documents
            SET status = @nextStatus,
                journal_id = @journalId,
                posted_by = @postedBy,
                posted_at = @postedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @postedAt
            WHERE id = @documentId
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
        `).run(input);
    }
    saveReversalState(input) {
        this.db.prepare(`
            UPDATE treasury_documents
            SET status = @nextStatus,
                reversal_journal_id = @reversalJournalId,
                reversed_by = @reversedBy,
                reversed_at = @reversedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @reversedAt
            WHERE id = @documentId
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
        `).run(input);
    }
    getChequeById(companyId, chequeId) {
        const row = this.db.prepare(`
            SELECT *
            FROM cheque_register
            WHERE id = ?
              AND company_id = ?
            LIMIT 1
        `).get(chequeId, companyId);
        return row ? this.mapCheque(row) : null;
    }
    getChequeByDocumentId(companyId, documentId) {
        const row = this.db.prepare(`
            SELECT *
            FROM cheque_register
            WHERE treasury_document_id = ?
              AND company_id = ?
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
        `).get(documentId, companyId);
        return row ? this.mapCheque(row) : null;
    }
    getChequeByNo(companyId, chequeNo, direction) {
        const row = this.db.prepare(`
            SELECT *
            FROM cheque_register
            WHERE company_id = ?
              AND UPPER(COALESCE(direction, '')) = ?
              AND UPPER(COALESCE(cheque_no, '')) = ?
              AND UPPER(COALESCE(status, '')) <> 'CANCELLED'
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
        `).get(companyId, direction, String(chequeNo || '').trim().toUpperCase());
        return row ? this.mapCheque(row) : null;
    }
    upsertDocumentCheque(input) {
        const existingByDocument = this.getChequeByDocumentId(input.companyId, input.documentId);
        const existingByNo = this.getChequeByNo(input.companyId, input.chequeNo, input.direction);
        if (existingByNo && (!existingByDocument || existingByNo.id !== existingByDocument.id)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Cheque number already exists for active records', {
                messageKey: 'validation.treasury.cheque_no_unique',
                details: { chequeNo: input.chequeNo, direction: input.direction },
            });
        }
        if (existingByDocument) {
            this.db.prepare(`
                UPDATE cheque_register
                SET branch_id = @branchId,
                    cheque_no = @chequeNo,
                    cheque_date = @chequeDate,
                    due_date = @dueDate,
                    amount = @amount,
                    currency_code = @currencyCode,
                    currency_rate = @currencyRate,
                    bank_name = @bankName,
                    drawer_name = @drawerName,
                    payee_name = @payeeName,
                    partner_id = @partnerId,
                    direction = @direction,
                    notes = @notes,
                    updated_at = @updatedAt
                WHERE id = @id
                  AND company_id = @companyId
            `).run({
                id: existingByDocument.id,
                companyId: input.companyId,
                branchId: input.branchId,
                chequeNo: input.chequeNo,
                chequeDate: input.chequeDate,
                dueDate: input.dueDate,
                amount: input.amount,
                currencyCode: input.currencyCode,
                currencyRate: input.currencyRate,
                bankName: input.bankName,
                drawerName: input.drawerName,
                payeeName: input.payeeName,
                partnerId: input.partnerId,
                direction: input.direction,
                notes: input.notes,
                updatedAt: input.updatedAt,
            });
            const updated = this.getChequeById(input.companyId, existingByDocument.id);
            if (!updated) {
                throw new errors_1.DomainError('INTERNAL_ERROR', 'Cheque was not found after update', {
                    details: { chequeId: existingByDocument.id },
                });
            }
            return updated;
        }
        const newId = input.id || this.nextIdentity();
        const initialStatus = input.direction === 'RECEIVED' ? 'IN_SAFE' : 'ISSUED_PENDING';
        this.db.prepare(`
            INSERT INTO cheque_register (
                id, company_id, branch_id, cheque_no, cheque_date, due_date,
                amount, currency_code, currency_rate, bank_name, drawer_name,
                payee_name, partner_id, status, direction, treasury_document_id,
                deposited_bank_account_id, cleared_date, returned_date,
                notes, created_at, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @chequeNo, @chequeDate, @dueDate,
                @amount, @currencyCode, @currencyRate, @bankName, @drawerName,
                @payeeName, @partnerId, @status, @direction, @documentId,
                NULL, NULL, NULL,
                @notes, @createdAt, @updatedAt
            )
        `).run({
            id: newId,
            companyId: input.companyId,
            branchId: input.branchId,
            chequeNo: input.chequeNo,
            chequeDate: input.chequeDate,
            dueDate: input.dueDate,
            amount: input.amount,
            currencyCode: input.currencyCode,
            currencyRate: input.currencyRate,
            bankName: input.bankName,
            drawerName: input.drawerName,
            payeeName: input.payeeName,
            partnerId: input.partnerId,
            status: initialStatus,
            direction: input.direction,
            documentId: input.documentId,
            notes: input.notes,
            createdAt: input.createdAt,
            updatedAt: input.updatedAt,
        });
        const inserted = this.getChequeById(input.companyId, newId);
        if (!inserted) {
            throw new errors_1.DomainError('INTERNAL_ERROR', 'Cheque was not found after insert', {
                details: { chequeId: newId },
            });
        }
        return inserted;
    }
    updateChequeState(input) {
        this.db.prepare(`
            UPDATE cheque_register
            SET status = @status,
                deposited_bank_account_id = @depositedBankAccountId,
                cleared_date = @clearedDate,
                returned_date = @returnedDate,
                notes = COALESCE(@notes, notes),
                updated_at = @updatedAt
            WHERE id = @chequeId
              AND company_id = @companyId
        `).run(input);
    }
    getChequeEvent(companyId, chequeId, eventType) {
        const row = this.db.prepare(`
            SELECT *
            FROM cheque_event_registry
            WHERE company_id = ?
              AND cheque_id = ?
              AND event_type = ?
            LIMIT 1
        `).get(companyId, chequeId, eventType);
        if (!row)
            return null;
        return {
            id: row.id,
            companyId: row.company_id,
            chequeId: row.cheque_id,
            eventType: this.normalizeChequeEventType(row.event_type),
            eventDate: row.event_date,
            journalId: row.journal_id || null,
            sourceType: row.source_type,
            sourceVersion: Number(row.source_version || 1),
            createdAt: row.created_at,
        };
    }
    saveChequeEvent(event) {
        this.db.prepare(`
            INSERT OR IGNORE INTO cheque_event_registry (
                id,
                company_id,
                cheque_id,
                event_type,
                event_date,
                journal_id,
                source_type,
                source_version,
                created_at
            ) VALUES (
                @id,
                @companyId,
                @chequeId,
                @eventType,
                @eventDate,
                @journalId,
                @sourceType,
                @sourceVersion,
                @createdAt
            )
        `).run(event);
    }
    mapCheque(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            chequeNo: row.cheque_no,
            chequeDate: row.cheque_date,
            dueDate: row.due_date || null,
            amount: Number(row.amount || 0),
            currencyCode: String(row.currency_code || 'ILS').trim().toUpperCase(),
            currencyRate: Number(row.currency_rate || 1),
            bankName: row.bank_name || null,
            drawerName: row.drawer_name || null,
            payeeName: row.payee_name || null,
            partnerId: row.partner_id || null,
            status: this.normalizeChequeStatus(row.status),
            direction: this.normalizeChequeDirection(row.direction),
            treasuryDocumentId: row.treasury_document_id || null,
            depositedBankAccountId: row.deposited_bank_account_id || null,
            clearedDate: row.cleared_date || null,
            returnedDate: row.returned_date || null,
            notes: row.notes || null,
            createdAt: String(row.created_at || ''),
            updatedAt: String(row.updated_at || ''),
        };
    }
    normalizeDocType(rawType) {
        const normalized = String(rawType || '').trim().toUpperCase();
        if (normalized === 'CASH_PAYMENT')
            return 'CASH_PAYMENT';
        if (normalized === 'BANK_RECEIPT')
            return 'BANK_RECEIPT';
        if (normalized === 'BANK_PAYMENT')
            return 'BANK_PAYMENT';
        if (normalized === 'CHEQUE_RECEIPT')
            return 'CHEQUE_RECEIPT';
        if (normalized === 'CHEQUE_PAYMENT')
            return 'CHEQUE_PAYMENT';
        return 'CASH_RECEIPT';
    }
    normalizeStatus(rawStatus) {
        const normalized = String(rawStatus || '').trim().toUpperCase();
        if (normalized === 'POSTED')
            return 'POSTED';
        if (normalized === 'CANCELLED')
            return 'CANCELLED';
        return 'DRAFT';
    }
    normalizeChequeDirection(rawDirection) {
        const normalized = String(rawDirection || '').trim().toUpperCase();
        if (normalized === 'ISSUED')
            return 'ISSUED';
        return 'RECEIVED';
    }
    normalizeChequeStatus(rawStatus) {
        const normalized = String(rawStatus || '').trim().toUpperCase();
        if (normalized === 'DEPOSITED')
            return 'DEPOSITED';
        if (normalized === 'CLEARED')
            return 'CLEARED';
        if (normalized === 'RETURNED')
            return 'RETURNED';
        if (normalized === 'CANCELLED')
            return 'CANCELLED';
        if (normalized === 'ISSUED_PENDING')
            return 'ISSUED_PENDING';
        if (normalized === 'ISSUED_CLEARED')
            return 'ISSUED_CLEARED';
        return 'IN_SAFE';
    }
    normalizeChequeEventType(rawEventType) {
        const normalized = String(rawEventType || '').trim().toUpperCase();
        if (normalized === 'ISSUE')
            return 'ISSUE';
        if (normalized === 'DEPOSIT')
            return 'DEPOSIT';
        if (normalized === 'CLEAR_RECEIVED')
            return 'CLEAR_RECEIVED';
        if (normalized === 'RETURN_RECEIVED')
            return 'RETURN_RECEIVED';
        if (normalized === 'CLEAR_ISSUED')
            return 'CLEAR_ISSUED';
        if (normalized === 'CANCEL')
            return 'CANCEL';
        return 'RECEIVE';
    }
    getDocTypePrefix(docType) {
        switch (docType) {
            case 'CASH_RECEIPT':
                return 'CRV';
            case 'CASH_PAYMENT':
                return 'CPV';
            case 'BANK_RECEIPT':
                return 'BRV';
            case 'BANK_PAYMENT':
                return 'BPV';
            case 'CHEQUE_RECEIPT':
                return 'CHR';
            case 'CHEQUE_PAYMENT':
                return 'CHP';
            default:
                return 'TRS';
        }
    }
}
exports.SqliteTreasuryRepo = SqliteTreasuryRepo;
