import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../domain/errors';
import { SqliteFinancialPlatformRepo } from '../../infrastructure/adapters/SqliteFinancialPlatformRepo';

type RequestContext = {
    companyId: string;
    branchId: string;
    userId: string;
    permissions?: string[];
    capabilities?: string[];
};

export class FinancialPlatformUseCases {
    constructor(private repo: SqliteFinancialPlatformRepo) { }

    private ensureAuthorized(
        ctx: RequestContext,
        capabilityKey: string,
        legacyPermissions: string[] = []
    ) {
        const capabilities = Array.isArray(ctx.capabilities) ? ctx.capabilities : [];
        const permissions = Array.isArray(ctx.permissions) ? ctx.permissions : [];

        const allowed =
            capabilities.includes(capabilityKey) ||
            permissions.includes(capabilityKey) ||
            permissions.includes('ALL') ||
            permissions.includes('*.*') ||
            legacyPermissions.some((p) => permissions.includes(p));

        if (!allowed) {
            throw new DomainError('PERMISSION_DENIED', `Missing permission for ${capabilityKey}`);
        }
    }

    private audit(
        ctx: RequestContext,
        actionKey: string,
        entityName: string,
        entityId: string,
        payload: any
    ) {
        this.repo.appendAuditEvent({
            id: uuidv4(),
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            actorUserId: ctx.userId,
            actionKey,
            entityName,
            entityId,
            payloadJson: JSON.stringify(payload || {}),
        });
    }

    startCloseCycle(ctx: RequestContext, period: string) {
        this.ensureAuthorized(ctx, 'accounting.period.close', ['gl.closing']);
        const cycle = this.repo.startCloseCycle({
            id: uuidv4(),
            companyId: ctx.companyId,
            period,
            startedBy: ctx.userId,
        });
        this.audit(ctx, 'accounting.period.close', 'fin_close_cycles', cycle.id, cycle);
        return cycle;
    }

    createConsolidationRun(ctx: RequestContext, data: { groupCode: string; period: string; notes?: string }) {
        this.ensureAuthorized(ctx, 'consolidation.run.start', ['gl.reports']);
        const run = this.repo.createConsolidationRun({
            id: uuidv4(),
            companyId: ctx.companyId,
            groupCode: data.groupCode,
            period: data.period,
            startedBy: ctx.userId,
            notes: data.notes,
        });
        this.audit(ctx, 'consolidation.run.start', 'fin_consolidation_runs', run.id, run);
        return run;
    }

    upsertCashPosition(ctx: RequestContext, data: {
        branchId?: string;
        asOfDate: string;
        currency: string;
        availableBalance: number;
        projectedIn?: number;
        projectedOut?: number;
    }) {
        this.ensureAuthorized(ctx, 'treasury.cash_position.update', ['gl.banks', 'treasury.payment']);
        const row = this.repo.upsertCashPosition({
            id: uuidv4(),
            companyId: ctx.companyId,
            branchId: data.branchId || ctx.branchId,
            asOfDate: data.asOfDate,
            currency: data.currency,
            availableBalance: Number(data.availableBalance || 0),
            projectedIn: Number(data.projectedIn || 0),
            projectedOut: Number(data.projectedOut || 0),
            updatedBy: ctx.userId,
        });
        this.audit(ctx, 'treasury.cash_position.update', 'fin_cash_positions', row.id, row);
        return row;
    }

    createPaymentRun(ctx: RequestContext, data: {
        branchId?: string;
        runDate: string;
        amount: number;
        currency: string;
    }) {
        this.ensureAuthorized(ctx, 'treasury.payment.run.execute', ['treasury.payment']);
        const run = this.repo.createPaymentRun({
            id: uuidv4(),
            companyId: ctx.companyId,
            branchId: data.branchId || ctx.branchId,
            runDate: data.runDate,
            amount: Number(data.amount || 0),
            currency: data.currency,
            initiatedBy: ctx.userId,
        });
        this.audit(ctx, 'treasury.payment.run.execute', 'fin_payment_runs', run.id, run);
        return run;
    }

    submitRiskAssessment(ctx: RequestContext, data: {
        domain: string;
        riskScore: number;
        riskLevel: string;
        notes?: string;
    }) {
        this.ensureAuthorized(ctx, 'grc.risk.assess', ['system.logs', 'system.settings']);
        const assessment = this.repo.createRiskAssessment({
            id: uuidv4(),
            companyId: ctx.companyId,
            domain: data.domain,
            riskScore: Number(data.riskScore || 0),
            riskLevel: data.riskLevel,
            notes: data.notes,
            assessedBy: ctx.userId,
        });
        this.audit(ctx, 'grc.risk.assess', 'fin_risk_assessments', assessment.id, assessment);
        return assessment;
    }

    createRevenueContract(ctx: RequestContext, data: {
        customerId: string;
        contractNo: string;
        startDate: string;
        endDate: string;
        totalValue: number;
    }) {
        this.ensureAuthorized(ctx, 'revenue.contract.create', ['sales.create']);
        const contract = this.repo.createRevenueContract({
            id: uuidv4(),
            companyId: ctx.companyId,
            customerId: data.customerId,
            contractNo: data.contractNo,
            startDate: data.startDate,
            endDate: data.endDate,
            totalValue: Number(data.totalValue || 0),
            createdBy: ctx.userId,
        });
        this.audit(ctx, 'revenue.contract.create', 'fin_revenue_contracts', contract.id, contract);
        return contract;
    }

    runRevenueRecognition(ctx: RequestContext, data: {
        period: string;
        runDate: string;
        recognizedAmount: number;
    }) {
        this.ensureAuthorized(ctx, 'revenue.recognition.run', ['gl.post']);
        const run = this.repo.createRevenueRecognitionRun({
            id: uuidv4(),
            companyId: ctx.companyId,
            runDate: data.runDate,
            period: data.period,
            recognizedAmount: Number(data.recognizedAmount || 0),
            initiatedBy: ctx.userId,
        });
        this.audit(ctx, 'revenue.recognition.run', 'fin_revenue_recognition_runs', run.id, run);
        return run;
    }

    postCarbonEntry(ctx: RequestContext, data: {
        branchId?: string;
        entryDate: string;
        scopeCode: string;
        co2eTons: number;
        sourceRef?: string;
        notes?: string;
    }) {
        this.ensureAuthorized(ctx, 'sustainability.carbon.entry.post', ['gl.post']);
        const entry = this.repo.postCarbonEntry({
            id: uuidv4(),
            companyId: ctx.companyId,
            branchId: data.branchId || ctx.branchId,
            entryDate: data.entryDate,
            scopeCode: data.scopeCode,
            co2eTons: Number(data.co2eTons || 0),
            sourceRef: data.sourceRef,
            notes: data.notes,
            postedBy: ctx.userId,
        });
        this.audit(ctx, 'sustainability.carbon.entry.post', 'fin_carbon_entries', entry.id, entry);
        return entry;
    }

    runAnalyticsForecast(ctx: RequestContext, data: {
        runType: string;
        period: string;
        outputRef?: string;
    }) {
        this.ensureAuthorized(ctx, 'analytics.forecast.generate', ['reports.financial', 'reports.view_all']);
        const run = this.repo.createAnalyticsRun({
            id: uuidv4(),
            companyId: ctx.companyId,
            runType: data.runType,
            period: data.period,
            initiatedBy: ctx.userId,
            outputRef: data.outputRef,
        });
        this.audit(ctx, 'analytics.forecast.generate', 'fin_analytics_runs', run.id, run);
        return run;
    }

    getExecutiveSnapshot(ctx: RequestContext) {
        this.ensureAuthorized(ctx, 'analytics.dashboard.financial.view', ['reports.financial', 'reports.view_all']);
        return this.repo.getExecutiveSnapshot(ctx.companyId);
    }
}
