"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteFinancialPlatformRepo = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SqliteFinancialPlatformRepo {
    constructor(database) {
        this.db = database || new better_sqlite3_1.default('wafi.db');
        this.applyPragmas();
        this.ensureTables();
    }
    applyPragmas() {
        try {
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('foreign_keys = ON');
            this.db.pragma('busy_timeout = 5000');
        }
        catch (error) {
            console.warn('[FinancialPlatformRepo] PRAGMA setup warning:', error?.message || error);
        }
    }
    ensureTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS fin_close_cycles (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                period TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'OPEN',
                started_by TEXT NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                approved_by TEXT,
                approved_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS fin_consolidation_runs (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                group_code TEXT NOT NULL,
                period TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'RUNNING',
                started_by TEXT NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS fin_cash_positions (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                as_of_date TEXT NOT NULL,
                currency TEXT NOT NULL,
                available_balance REAL NOT NULL DEFAULT 0,
                projected_in REAL NOT NULL DEFAULT 0,
                projected_out REAL NOT NULL DEFAULT 0,
                updated_by TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fin_payment_runs (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                run_date TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                initiated_by TEXT NOT NULL,
                approved_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fin_risk_assessments (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                domain TEXT NOT NULL,
                risk_score REAL NOT NULL,
                risk_level TEXT NOT NULL,
                notes TEXT,
                assessed_by TEXT NOT NULL,
                assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fin_revenue_contracts (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                contract_no TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                total_value REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                created_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fin_revenue_recognition_runs (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                run_date TEXT NOT NULL,
                period TEXT NOT NULL,
                recognized_amount REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'POSTED',
                initiated_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fin_carbon_entries (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                scope_code TEXT NOT NULL,
                co2e_tons REAL NOT NULL,
                source_ref TEXT,
                notes TEXT,
                posted_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fin_analytics_runs (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                run_type TEXT NOT NULL,
                period TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'COMPLETED',
                output_ref TEXT,
                initiated_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fin_audit_events (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                actor_user_id TEXT NOT NULL,
                action_key TEXT NOT NULL,
                entity_name TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                payload_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_fin_close_company_period
                ON fin_close_cycles(company_id, period);
            CREATE INDEX IF NOT EXISTS idx_fin_cash_company_branch_date
                ON fin_cash_positions(company_id, branch_id, as_of_date DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_payment_company_date
                ON fin_payment_runs(company_id, run_date DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_revenue_contract_company
                ON fin_revenue_contracts(company_id, contract_no);
            CREATE INDEX IF NOT EXISTS idx_fin_carbon_company_date
                ON fin_carbon_entries(company_id, entry_date DESC);

            CREATE INDEX IF NOT EXISTS idx_fin_audit_company_time
                ON fin_audit_events(company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_audit_actor_time
                ON fin_audit_events(actor_user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_audit_entity_time
                ON fin_audit_events(entity_name, entity_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_audit_action_time
                ON fin_audit_events(action_key, created_at DESC);
        `);
    }
    startCloseCycle(input) {
        this.db.prepare(`
            INSERT INTO fin_close_cycles (id, company_id, period, status, started_by)
            VALUES (@id, @companyId, @period, 'OPEN', @startedBy)
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_close_cycles WHERE id = ?').get(input.id);
    }
    createConsolidationRun(input) {
        this.db.prepare(`
            INSERT INTO fin_consolidation_runs (id, company_id, group_code, period, status, started_by, notes)
            VALUES (@id, @companyId, @groupCode, @period, 'RUNNING', @startedBy, @notes)
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_consolidation_runs WHERE id = ?').get(input.id);
    }
    upsertCashPosition(input) {
        this.db.prepare(`
            INSERT INTO fin_cash_positions (
                id, company_id, branch_id, as_of_date, currency, available_balance, projected_in, projected_out, updated_by, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @asOfDate, @currency, @availableBalance, @projectedIn, @projectedOut, @updatedBy, CURRENT_TIMESTAMP
            )
            ON CONFLICT(id) DO UPDATE SET
                available_balance = excluded.available_balance,
                projected_in = excluded.projected_in,
                projected_out = excluded.projected_out,
                updated_by = excluded.updated_by,
                updated_at = CURRENT_TIMESTAMP
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_cash_positions WHERE id = ?').get(input.id);
    }
    createPaymentRun(input) {
        this.db.prepare(`
            INSERT INTO fin_payment_runs (
                id, company_id, branch_id, run_date, amount, currency, status, initiated_by
            ) VALUES (
                @id, @companyId, @branchId, @runDate, @amount, @currency, 'DRAFT', @initiatedBy
            )
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_payment_runs WHERE id = ?').get(input.id);
    }
    createRiskAssessment(input) {
        this.db.prepare(`
            INSERT INTO fin_risk_assessments (
                id, company_id, domain, risk_score, risk_level, notes, assessed_by
            ) VALUES (
                @id, @companyId, @domain, @riskScore, @riskLevel, @notes, @assessedBy
            )
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_risk_assessments WHERE id = ?').get(input.id);
    }
    createRevenueContract(input) {
        this.db.prepare(`
            INSERT INTO fin_revenue_contracts (
                id, company_id, customer_id, contract_no, start_date, end_date, total_value, status, created_by
            ) VALUES (
                @id, @companyId, @customerId, @contractNo, @startDate, @endDate, @totalValue, 'ACTIVE', @createdBy
            )
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_revenue_contracts WHERE id = ?').get(input.id);
    }
    createRevenueRecognitionRun(input) {
        this.db.prepare(`
            INSERT INTO fin_revenue_recognition_runs (
                id, company_id, run_date, period, recognized_amount, status, initiated_by
            ) VALUES (
                @id, @companyId, @runDate, @period, @recognizedAmount, 'POSTED', @initiatedBy
            )
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_revenue_recognition_runs WHERE id = ?').get(input.id);
    }
    postCarbonEntry(input) {
        this.db.prepare(`
            INSERT INTO fin_carbon_entries (
                id, company_id, branch_id, entry_date, scope_code, co2e_tons, source_ref, notes, posted_by
            ) VALUES (
                @id, @companyId, @branchId, @entryDate, @scopeCode, @co2eTons, @sourceRef, @notes, @postedBy
            )
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_carbon_entries WHERE id = ?').get(input.id);
    }
    createAnalyticsRun(input) {
        this.db.prepare(`
            INSERT INTO fin_analytics_runs (
                id, company_id, run_type, period, status, output_ref, initiated_by
            ) VALUES (
                @id, @companyId, @runType, @period, 'COMPLETED', @outputRef, @initiatedBy
            )
        `).run(input);
        return this.db.prepare('SELECT * FROM fin_analytics_runs WHERE id = ?').get(input.id);
    }
    appendAuditEvent(event) {
        this.db.prepare(`
            INSERT INTO fin_audit_events (
                id, company_id, branch_id, actor_user_id, action_key, entity_name, entity_id, payload_json
            ) VALUES (
                @id, @companyId, @branchId, @actorUserId, @actionKey, @entityName, @entityId, @payloadJson
            )
        `).run(event);
    }
    getExecutiveSnapshot(companyId) {
        const openCloseCycles = this.db.prepare(`
            SELECT count(*) as c FROM fin_close_cycles
            WHERE company_id = ? AND status = 'OPEN'
        `).get(companyId);
        const openPaymentRuns = this.db.prepare(`
            SELECT count(*) as c FROM fin_payment_runs
            WHERE company_id = ? AND status IN ('DRAFT', 'PENDING_APPROVAL')
        `).get(companyId);
        const activeRevenueContracts = this.db.prepare(`
            SELECT count(*) as c FROM fin_revenue_contracts
            WHERE company_id = ? AND status = 'ACTIVE'
        `).get(companyId);
        const latestRisk = this.db.prepare(`
            SELECT risk_level, risk_score, assessed_at
            FROM fin_risk_assessments
            WHERE company_id = ?
            ORDER BY assessed_at DESC
            LIMIT 1
        `).get(companyId);
        const latestCarbon = this.db.prepare(`
            SELECT COALESCE(sum(co2e_tons), 0) as total
            FROM fin_carbon_entries
            WHERE company_id = ?
        `).get(companyId);
        return {
            companyId,
            openCloseCycles: Number(openCloseCycles?.c || 0),
            openPaymentRuns: Number(openPaymentRuns?.c || 0),
            activeRevenueContracts: Number(activeRevenueContracts?.c || 0),
            latestRisk: latestRisk || null,
            carbonTotalTons: Number(latestCarbon?.total || 0),
        };
    }
}
exports.SqliteFinancialPlatformRepo = SqliteFinancialPlatformRepo;
