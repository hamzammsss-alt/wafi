"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManufacturingService = void 0;
const errors_1 = require("../../domain/errors");
const EPSILON = 0.000001;
class ManufacturingService {
    constructor(repository, stockLedgerService, accountingBuilder, journalEngineUseCases) {
        this.repository = repository;
        this.stockLedgerService = stockLedgerService;
        this.accountingBuilder = accountingBuilder;
        this.journalEngineUseCases = journalEngineUseCases;
        this.repository.ensureSchema();
    }
    createBom(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const itemId = this.normalizeRequired(input.itemId, 'Finished item is required');
        const createdBy = this.normalizeRequired(input.createdBy || context.userId, 'Created by is required');
        const outputQty = this.normalizePositive(input.outputQty, 'BOM output quantity must be greater than zero');
        this.assertStockItemExists(itemId, 'Finished item was not found or inactive');
        const lines = this.normalizeBomLines(input.lines || [], itemId);
        this.assertNoCircularBom(companyId, itemId, lines.map((line) => line.componentItemId));
        const existingByItem = this.repository.listBomHeadersByItem(companyId, itemId);
        const nextVersion = Number(input.versionNo || 0) > 0
            ? Number(input.versionNo)
            : existingByItem.reduce((max, row) => Math.max(max, Number(row.header.versionNo || 0)), 0) + 1;
        const now = new Date().toISOString();
        const payload = {
            id: this.repository.nextIdentity(),
            companyId,
            itemId,
            versionNo: nextVersion,
            status: 'DRAFT',
            isDefault: Boolean(input.isDefault),
            outputQty,
            effectiveFrom: this.normalizeDateOrNull(input.effectiveFrom),
            effectiveTo: this.normalizeDateOrNull(input.effectiveTo),
            remarks: this.normalizeNullable(input.remarks),
            createdBy,
            approvedBy: null,
            createdAt: now,
            updatedAt: now,
            lines: lines.map((line, index) => ({
                id: this.repository.nextIdentity(),
                lineNo: index + 1,
                componentItemId: line.componentItemId,
                warehouseId: line.warehouseId,
                qtyPer: line.qtyPer,
                scrapPercent: line.scrapPercent,
                issueMethod: line.issueMethod,
                remarks: line.remarks,
            })),
        };
        const bom = this.repository.runInTransaction(() => {
            const created = this.repository.createBom(payload);
            if (payload.isDefault) {
                this.repository.setBomDefault(companyId, itemId, payload.id, now);
            }
            return this.repository.getBomById(companyId, created.header.id);
        });
        return bom;
    }
    updateBom(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const bomId = this.normalizeRequired(input.id, 'BOM id is required');
        const current = this.requireBom(companyId, bomId);
        if (current.header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled BOM cannot be updated', {
                messageKey: 'validation.manufacturing.bom.cancelled',
                details: { bomId },
            });
        }
        const outputQty = this.normalizePositive(input.outputQty, 'BOM output quantity must be greater than zero');
        const lines = this.normalizeBomLines(input.lines || [], current.header.itemId);
        this.assertNoCircularBom(companyId, current.header.itemId, lines.map((line) => line.componentItemId));
        const now = new Date().toISOString();
        const payload = {
            id: bomId,
            companyId,
            outputQty,
            effectiveFrom: this.normalizeDateOrNull(input.effectiveFrom),
            effectiveTo: this.normalizeDateOrNull(input.effectiveTo),
            remarks: this.normalizeNullable(input.remarks),
            approvedBy: this.normalizeNullable(input.approvedBy),
            updatedAt: now,
            lines: lines.map((line, index) => ({
                id: this.normalizeNullable(input.lines[index]?.id) || this.repository.nextIdentity(),
                lineNo: index + 1,
                componentItemId: line.componentItemId,
                warehouseId: line.warehouseId,
                qtyPer: line.qtyPer,
                scrapPercent: line.scrapPercent,
                issueMethod: line.issueMethod,
                remarks: line.remarks,
            })),
        };
        return this.repository.updateBom(payload);
    }
    getBomById(context, bomId) {
        return this.requireBom(this.normalizeRequired(context.companyId, 'Company id is required'), this.normalizeRequired(bomId, 'BOM id is required'));
    }
    getDefaultBomForItem(context, itemId, asOfDate) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedItemId = this.normalizeRequired(itemId, 'Item id is required');
        const bom = this.repository.getDefaultBomForItem(companyId, normalizedItemId, this.normalizeDateOrNull(asOfDate));
        if (!bom) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Default BOM was not found for item', {
                messageKey: 'validation.manufacturing.bom.default_not_found',
                details: { itemId: normalizedItemId },
            });
        }
        return bom;
    }
    setBomDefault(context, bomId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedBomId = this.normalizeRequired(bomId, 'BOM id is required');
        const bom = this.requireBom(companyId, normalizedBomId);
        if (bom.header.status !== 'CONFIRMED') {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Only confirmed BOM can be set as default', {
                messageKey: 'validation.manufacturing.bom.default_requires_confirmed',
                details: { bomId: normalizedBomId, status: bom.header.status },
            });
        }
        const now = new Date().toISOString();
        this.repository.setBomDefault(companyId, bom.header.itemId, normalizedBomId, now);
        return this.requireBom(companyId, normalizedBomId);
    }
    confirmBom(context, bomId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedBomId = this.normalizeRequired(bomId, 'BOM id is required');
        const bom = this.requireBom(companyId, normalizedBomId);
        if (!bom.lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM must include at least one component line', {
                messageKey: 'validation.manufacturing.bom.lines_required',
                details: { bomId: normalizedBomId },
            });
        }
        const now = new Date().toISOString();
        this.repository.setBomStatus(companyId, normalizedBomId, 'CONFIRMED', context.userId, now);
        return this.requireBom(companyId, normalizedBomId);
    }
    cancelBom(context, bomId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedBomId = this.normalizeRequired(bomId, 'BOM id is required');
        this.requireBom(companyId, normalizedBomId);
        const now = new Date().toISOString();
        this.repository.setBomStatus(companyId, normalizedBomId, 'CANCELLED', context.userId, now);
        return this.requireBom(companyId, normalizedBomId);
    }
    createRouting(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const itemId = this.normalizeRequired(input.itemId, 'Finished item is required');
        const createdBy = this.normalizeRequired(input.createdBy || context.userId, 'Created by is required');
        this.assertStockItemExists(itemId, 'Finished item was not found or inactive');
        const steps = this.normalizeRoutingSteps(input.steps || []);
        const existingDefault = this.repository.getDefaultRoutingForItem(companyId, itemId);
        const nextVersion = Number(input.versionNo || 0) > 0
            ? Number(input.versionNo)
            : Number(existingDefault?.header.versionNo || 0) + 1;
        const now = new Date().toISOString();
        const payload = {
            id: this.repository.nextIdentity(),
            companyId,
            itemId,
            versionNo: nextVersion,
            status: 'DRAFT',
            isDefault: Boolean(input.isDefault),
            remarks: this.normalizeNullable(input.remarks),
            createdBy,
            approvedBy: null,
            createdAt: now,
            updatedAt: now,
            steps: steps.map((step, index) => ({
                id: this.repository.nextIdentity(),
                stepNo: index + 1,
                workCenterCode: step.workCenterCode,
                operationCode: step.operationCode,
                setupTimeMinutes: step.setupTimeMinutes,
                runTimeMinutes: step.runTimeMinutes,
                laborCostRate: step.laborCostRate,
                machineCostRate: step.machineCostRate,
                remarks: step.remarks,
            })),
        };
        this.repository.runInTransaction(() => {
            this.repository.createRouting(payload);
            if (payload.isDefault) {
                this.repository.setRoutingDefault(companyId, itemId, payload.id, now);
            }
        });
        return this.requireRouting(companyId, payload.id);
    }
    updateRouting(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const routingId = this.normalizeRequired(input.id, 'Routing id is required');
        const current = this.requireRouting(companyId, routingId);
        if (current.header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled routing cannot be updated', {
                messageKey: 'validation.manufacturing.routing.cancelled',
                details: { routingId },
            });
        }
        const steps = this.normalizeRoutingSteps(input.steps || []);
        const now = new Date().toISOString();
        const payload = {
            id: routingId,
            companyId,
            remarks: this.normalizeNullable(input.remarks),
            approvedBy: this.normalizeNullable(input.approvedBy),
            updatedAt: now,
            steps: steps.map((step, index) => ({
                id: this.normalizeNullable(input.steps[index]?.id) || this.repository.nextIdentity(),
                stepNo: index + 1,
                workCenterCode: step.workCenterCode,
                operationCode: step.operationCode,
                setupTimeMinutes: step.setupTimeMinutes,
                runTimeMinutes: step.runTimeMinutes,
                laborCostRate: step.laborCostRate,
                machineCostRate: step.machineCostRate,
                remarks: step.remarks,
            })),
        };
        this.repository.updateRouting(payload);
        return this.requireRouting(companyId, routingId);
    }
    getRoutingById(context, routingId) {
        return this.requireRouting(this.normalizeRequired(context.companyId, 'Company id is required'), this.normalizeRequired(routingId, 'Routing id is required'));
    }
    getDefaultRoutingForItem(context, itemId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedItemId = this.normalizeRequired(itemId, 'Item id is required');
        const routing = this.repository.getDefaultRoutingForItem(companyId, normalizedItemId);
        if (!routing) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Default routing was not found for item', {
                messageKey: 'validation.manufacturing.routing.default_not_found',
                details: { itemId: normalizedItemId },
            });
        }
        return routing;
    }
    setRoutingDefault(context, routingId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedRoutingId = this.normalizeRequired(routingId, 'Routing id is required');
        const routing = this.requireRouting(companyId, normalizedRoutingId);
        if (routing.header.status !== 'CONFIRMED') {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Only confirmed routing can be set as default', {
                messageKey: 'validation.manufacturing.routing.default_requires_confirmed',
                details: { routingId: normalizedRoutingId, status: routing.header.status },
            });
        }
        this.repository.setRoutingDefault(companyId, routing.header.itemId, normalizedRoutingId, new Date().toISOString());
        return this.requireRouting(companyId, normalizedRoutingId);
    }
    confirmRouting(context, routingId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedRoutingId = this.normalizeRequired(routingId, 'Routing id is required');
        const routing = this.requireRouting(companyId, normalizedRoutingId);
        if (!routing.steps.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Routing must include at least one step', {
                messageKey: 'validation.manufacturing.routing.steps_required',
                details: { routingId: normalizedRoutingId },
            });
        }
        this.repository.setRoutingStatus(companyId, normalizedRoutingId, 'CONFIRMED', context.userId, new Date().toISOString());
        return this.requireRouting(companyId, normalizedRoutingId);
    }
    cancelRouting(context, routingId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedRoutingId = this.normalizeRequired(routingId, 'Routing id is required');
        this.requireRouting(companyId, normalizedRoutingId);
        this.repository.setRoutingStatus(companyId, normalizedRoutingId, 'CANCELLED', context.userId, new Date().toISOString());
        return this.requireRouting(companyId, normalizedRoutingId);
    }
    createProductionOrder(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const orderDate = this.normalizeDate(input.orderDate, 'Order date is required');
        const itemId = this.normalizeRequired(input.itemId, 'Finished item is required');
        const warehouseId = this.normalizeRequired(input.warehouseId, 'Warehouse is required');
        const qtyPlanned = this.normalizePositive(input.qtyPlanned, 'Planned quantity must be greater than zero');
        this.assertStockItemExists(itemId, 'Finished item was not found or inactive');
        this.assertWarehouseExists(warehouseId, 'Warehouse was not found or inactive');
        const bom = input.bomId ? this.requireBom(companyId, input.bomId) : null;
        if (bom && bom.header.status !== 'CONFIRMED') {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM must be confirmed before production order creation', {
                messageKey: 'validation.manufacturing.bom.must_be_confirmed',
                details: { bomId: bom.header.id, status: bom.header.status },
            });
        }
        const routing = input.routingId ? this.requireRouting(companyId, input.routingId) : null;
        if (routing && routing.header.status !== 'CONFIRMED') {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Routing must be confirmed before production order creation', {
                messageKey: 'validation.manufacturing.routing.must_be_confirmed',
                details: { routingId: routing.header.id, status: routing.header.status },
            });
        }
        const now = new Date().toISOString();
        const components = bom ? this.explodeBomToComponents(bom, qtyPlanned, warehouseId) : [];
        const operations = routing ? this.expandRoutingOperations(routing, qtyPlanned) : [];
        const laborCostEstimated = this.round(operations.reduce((sum, row) => sum + this.estimateLaborCost(row), 0));
        const machineCostEstimated = this.round(operations.reduce((sum, row) => sum + this.estimateMachineCost(row), 0));
        const payload = {
            id: this.repository.nextIdentity(),
            companyId,
            branchId,
            orderNo: this.repository.nextDocumentNo(companyId, branchId, 'MFG_ORDER'),
            orderDate,
            status: 'DRAFT',
            itemId,
            bomId: bom?.header.id || this.normalizeNullable(input.bomId),
            routingId: routing?.header.id || this.normalizeNullable(input.routingId),
            warehouseId,
            qtyPlanned,
            qtyStarted: 0,
            qtyCompleted: 0,
            qtyScrapped: 0,
            qtyIssued: 0,
            materialCostIssued: 0,
            laborCostEstimated,
            machineCostEstimated,
            costCapitalized: 0,
            totalWipCost: this.round(laborCostEstimated + machineCostEstimated),
            unitCostCompleted: 0,
            referenceNo: this.normalizeNullable(input.referenceNo),
            remarks: this.normalizeNullable(input.remarks),
            projectId: this.normalizeNullable(input.projectId),
            costCenterId: this.normalizeNullable(input.costCenterId),
            createdBy: this.normalizeRequired(input.createdBy || context.userId, 'Created by is required'),
            approvedBy: this.normalizeNullable(input.approvedBy),
            sourceDocType: this.normalizeNullable(input.sourceDocType),
            sourceDocId: this.normalizeNullable(input.sourceDocId),
            createdAt: now,
            updatedAt: now,
            components,
            operations,
        };
        const header = this.repository.createProductionOrder(payload);
        return this.getOrderDocumentById(companyId, branchId, header.id);
    }
    createProductionOrderFromBom(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const itemId = this.normalizeRequired(input.itemId, 'Finished item is required');
        const orderDate = this.normalizeDate(input.orderDate, 'Order date is required');
        const bom = input.bomId
            ? this.requireBom(companyId, input.bomId)
            : this.repository.getDefaultBomForItem(companyId, itemId, orderDate);
        if (!bom) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM is required for createFromBom', {
                messageKey: 'validation.manufacturing.bom.required',
                details: { itemId },
            });
        }
        const routing = input.routingId
            ? this.requireRouting(companyId, input.routingId)
            : this.repository.getDefaultRoutingForItem(companyId, itemId);
        return this.createProductionOrder(context, {
            orderDate,
            itemId,
            bomId: bom.header.id,
            routingId: routing?.header.id || null,
            warehouseId: input.warehouseId,
            qtyPlanned: input.qtyPlanned,
            referenceNo: input.referenceNo,
            remarks: input.remarks,
            projectId: input.projectId,
            costCenterId: input.costCenterId,
            createdBy: input.createdBy,
            approvedBy: input.approvedBy,
            sourceDocType: input.sourceDocType,
            sourceDocId: input.sourceDocId,
        });
    }
    updateProductionOrder(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const orderId = this.normalizeRequired(input.id, 'Production order id is required');
        const order = this.requireOrder(companyId, branchId, orderId);
        if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Completed/cancelled production order cannot be updated', {
                messageKey: 'validation.manufacturing.order.read_only',
                details: { orderId, status: order.status },
            });
        }
        const qtyPlanned = this.normalizePositive(input.qtyPlanned, 'Planned quantity must be greater than zero');
        if (qtyPlanned + EPSILON < Math.max(order.qtyCompleted, order.qtyIssued)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Planned quantity cannot be less than issued/completed quantity', {
                messageKey: 'validation.manufacturing.order.qty_planned_too_low',
                details: {
                    orderId,
                    qtyPlanned,
                    qtyCompleted: order.qtyCompleted,
                    qtyIssued: order.qtyIssued,
                },
            });
        }
        this.assertWarehouseExists(input.warehouseId, 'Warehouse was not found or inactive');
        const payload = {
            id: order.id,
            companyId,
            branchId,
            orderDate: this.normalizeDate(input.orderDate, 'Order date is required'),
            warehouseId: this.normalizeRequired(input.warehouseId, 'Warehouse is required'),
            qtyPlanned,
            referenceNo: this.normalizeNullable(input.referenceNo),
            remarks: this.normalizeNullable(input.remarks),
            projectId: this.normalizeNullable(input.projectId),
            costCenterId: this.normalizeNullable(input.costCenterId),
            approvedBy: this.normalizeNullable(input.approvedBy),
            updatedAt: new Date().toISOString(),
        };
        this.repository.updateProductionOrder(payload);
        return this.getOrderDocumentById(companyId, branchId, order.id);
    }
    getProductionOrderById(context, orderId) {
        return this.getOrderDocumentById(this.normalizeRequired(context.companyId, 'Company id is required'), this.normalizeRequired(context.branchId, 'Branch id is required'), this.normalizeRequired(orderId, 'Production order id is required'));
    }
    releaseProductionOrder(context, orderId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const normalizedOrderId = this.normalizeRequired(orderId, 'Production order id is required');
        const order = this.requireOrder(companyId, branchId, normalizedOrderId);
        if (order.status === 'RELEASED' || order.status === 'IN_PROGRESS' || order.status === 'PARTIAL' || order.status === 'COMPLETED') {
            return this.getOrderDocumentById(companyId, branchId, normalizedOrderId);
        }
        if (order.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled production order cannot be released', {
                messageKey: 'validation.manufacturing.order.cancelled',
                details: { orderId: normalizedOrderId },
            });
        }
        this.repository.saveProductionOrderStatus({
            companyId,
            branchId,
            orderId: normalizedOrderId,
            status: 'RELEASED',
            approvedBy: context.userId,
            updatedAt: new Date().toISOString(),
        });
        return this.getOrderDocumentById(companyId, branchId, normalizedOrderId);
    }
    async cancelProductionOrder(context, orderId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const normalizedOrderId = this.normalizeRequired(orderId, 'Production order id is required');
        const order = this.requireOrder(companyId, branchId, normalizedOrderId);
        if (order.status === 'CANCELLED') {
            return this.getOrderDocumentById(companyId, branchId, normalizedOrderId);
        }
        const activeReceipts = this.repository.listPostedActiveReceiptsByOrder(normalizedOrderId);
        for (const receipt of activeReceipts) {
            await this.cancelProductionReceipt(context, {
                receiptId: receipt.id,
                reverseDate: new Date().toISOString().slice(0, 10),
                reason: `Auto reversal for production order cancellation ${order.orderNo}`,
            });
        }
        const activeIssues = this.repository.listPostedActiveIssuesByOrder(normalizedOrderId);
        for (const issue of activeIssues) {
            await this.cancelProductionIssue(context, {
                issueId: issue.id,
                reverseDate: new Date().toISOString().slice(0, 10),
                reason: `Auto reversal for production order cancellation ${order.orderNo}`,
            });
        }
        this.repository.saveProductionOrderStatus({
            companyId,
            branchId,
            orderId: normalizedOrderId,
            status: 'CANCELLED',
            approvedBy: context.userId,
            updatedAt: new Date().toISOString(),
        });
        return this.getOrderDocumentById(companyId, branchId, normalizedOrderId);
    }
    getProductionOrderStatusSummary(context, orderId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const order = this.requireOrder(companyId, branchId, this.normalizeRequired(orderId, 'Production order id is required'));
        const components = this.repository.listProductionOrderComponents(order.id);
        return {
            orderId: order.id,
            orderNo: order.orderNo,
            status: order.status,
            qtyPlanned: order.qtyPlanned,
            qtyStarted: order.qtyStarted,
            qtyIssued: order.qtyIssued,
            qtyCompleted: order.qtyCompleted,
            qtyScrapped: order.qtyScrapped,
            remainingReceiptQty: this.round(Math.max(0, order.qtyPlanned - (order.qtyCompleted + order.qtyScrapped))),
            components: components.map((component) => {
                const netIssued = this.round(Math.max(0, component.qtyIssued - component.qtyReturned));
                return {
                    componentLineId: component.id,
                    lineNo: component.lineNo,
                    componentItemId: component.componentItemId,
                    warehouseId: component.warehouseId,
                    qtyRequired: component.qtyRequired,
                    qtyIssued: component.qtyIssued,
                    qtyReturned: component.qtyReturned,
                    remainingIssueQty: this.round(Math.max(0, component.qtyRequired - netIssued)),
                    issueMethod: component.issueMethod,
                };
            }),
        };
    }
    getProductionOrderCostSummary(context, orderId) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const refreshed = this.refreshOrderAggregates(companyId, branchId, this.normalizeRequired(orderId, 'Production order id is required'));
        return {
            orderId: refreshed.id,
            orderNo: refreshed.orderNo,
            materialCostIssued: refreshed.materialCostIssued,
            laborCostEstimated: refreshed.laborCostEstimated,
            machineCostEstimated: refreshed.machineCostEstimated,
            costCapitalized: refreshed.costCapitalized,
            totalWipCost: refreshed.totalWipCost,
            qtyCompleted: refreshed.qtyCompleted,
            unitCostCompleted: refreshed.unitCostCompleted,
        };
    }
    createProductionIssue(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const orderId = this.normalizeRequired(input.productionOrderId, 'Production order id is required');
        const order = this.requireOrder(companyId, branchId, orderId);
        this.assertOrderAllowsTransactions(order, 'Production issue cannot be created for cancelled/completed order');
        const issueDate = this.normalizeDate(input.issueDate, 'Issue date is required');
        const createdBy = this.normalizeRequired(input.createdBy || context.userId, 'Created by is required');
        const lines = this.normalizeIssueLines(input.lines || [], order);
        const now = new Date().toISOString();
        const payload = {
            id: this.repository.nextIdentity(),
            companyId,
            branchId,
            issueNo: this.repository.nextDocumentNo(companyId, branchId, 'MFG_ISSUE'),
            issueDate,
            status: 'DRAFT',
            productionOrderId: order.id,
            referenceNo: this.normalizeNullable(input.referenceNo),
            remarks: this.normalizeNullable(input.remarks),
            createdBy,
            approvedBy: this.normalizeNullable(input.approvedBy),
            version: 1,
            createdAt: now,
            updatedAt: now,
            lines,
        };
        return this.repository.createProductionIssue(payload);
    }
    getProductionIssueById(context, issueId) {
        return this.requireIssue(this.normalizeRequired(context.companyId, 'Company id is required'), this.normalizeRequired(context.branchId, 'Branch id is required'), this.normalizeRequired(issueId, 'Production issue id is required'));
    }
    async postProductionIssue(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const issueId = this.normalizeRequired(input.issueId, 'Production issue id is required');
        const issue = this.requireIssue(companyId, branchId, issueId);
        const header = issue.header;
        const lines = issue.lines;
        if (header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled issue cannot be posted', {
                messageKey: 'validation.manufacturing.issue.cancelled',
                details: { issueId },
            });
        }
        const order = this.requireOrder(companyId, branchId, header.productionOrderId);
        this.assertOrderAllowsTransactions(order, 'Production issue cannot be posted for cancelled/completed order');
        const sourceVersion = Number(header.version || 1) + 1;
        let journal = this.resolveOriginalJournal(companyId, {
            sourceType: 'PRODUCTION_MATERIAL_ISSUE',
            sourceId: header.id,
            sourceVersion,
            fallbackJournalId: header.journalId,
        });
        const stockAlreadyPosted = this.repository.hasStockLedgerPosting(companyId, 'PRODUCTION_MATERIAL_ISSUE', header.id, false);
        const policy = this.repository.getPolicy(companyId);
        const allowOverIssue = input.allowOverIssue === true || policy.allowOverIssue;
        this.validateIssuePostingLines(order, lines, allowOverIssue);
        if (header.status === 'POSTED' && stockAlreadyPosted && (!policy.issueAccountingEnabled || Boolean(journal))) {
            return {
                documentId: header.id,
                documentNo: header.issueNo,
                status: 'ALREADY_POSTED',
                sourceVersion,
                isStockPosted: true,
                isFinancialPosted: policy.issueAccountingEnabled ? Boolean(journal) : false,
                journalId: journal?.id || null,
                journalNo: journal?.journalNo || null,
            };
        }
        if (!stockAlreadyPosted) {
            this.stockLedgerService.postIssue(context, header, lines);
        }
        if (policy.issueAccountingEnabled && !journal) {
            const postingCommand = await this.accountingBuilder.buildIssueJournal({
                companyId,
                branchId,
                userId: context.userId,
                sourceVersion,
                order,
                header,
                lines,
            });
            if (postingCommand) {
                try {
                    const posted = this.journalEngineUseCases.postJournal(companyId, branchId, context.userId, postingCommand);
                    journal = this.journalEngineUseCases.getById(companyId, posted.journalId);
                }
                catch (error) {
                    if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                        throw error;
                    }
                    journal = this.resolveOriginalJournal(companyId, {
                        sourceType: 'PRODUCTION_MATERIAL_ISSUE',
                        sourceId: header.id,
                        sourceVersion,
                        fallbackJournalId: header.journalId,
                    });
                }
            }
        }
        const postingTime = new Date().toISOString();
        this.repository.runInTransaction(() => {
            const componentRows = this.repository.listProductionOrderComponents(order.id);
            this.repository.saveProductionIssuePostingState({
                companyId,
                branchId,
                issueId: header.id,
                journalId: journal?.id || null,
                postedBy: context.userId,
                postedAt: postingTime,
                stockPostedAt: postingTime,
                nextStatus: 'POSTED',
            });
            for (const line of lines) {
                const componentLineId = this.resolveIssueComponentLineId(componentRows, line);
                if (!componentLineId)
                    continue;
                this.repository.updateProductionOrderComponentProgress(order.id, componentLineId, line.qty, 0, postingTime);
            }
        });
        this.refreshOrderAggregates(companyId, branchId, order.id);
        return {
            documentId: header.id,
            documentNo: header.issueNo,
            status: stockAlreadyPosted && (!policy.issueAccountingEnabled || Boolean(journal)) ? 'ALREADY_POSTED' : 'POSTED',
            sourceVersion,
            isStockPosted: true,
            isFinancialPosted: policy.issueAccountingEnabled ? Boolean(journal) : false,
            journalId: journal?.id || null,
            journalNo: journal?.journalNo || null,
        };
    }
    async cancelProductionIssue(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const issueId = this.normalizeRequired(input.issueId, 'Production issue id is required');
        const reverseDate = this.normalizeDate(input.reverseDate, 'Reverse date is required');
        const issue = this.requireIssue(companyId, branchId, issueId);
        const header = issue.header;
        const lines = issue.lines;
        const sourceVersion = Number(header.version || 1) + 1;
        const stockPosted = this.repository.hasStockLedgerPosting(companyId, 'PRODUCTION_MATERIAL_ISSUE', header.id, false);
        const stockReversed = this.repository.hasStockLedgerPosting(companyId, 'PRODUCTION_MATERIAL_ISSUE', header.id, true);
        const originalJournal = this.resolveOriginalJournal(companyId, {
            sourceType: 'PRODUCTION_MATERIAL_ISSUE',
            sourceId: header.id,
            sourceVersion,
            fallbackJournalId: header.journalId,
        });
        let reversalJournal = this.resolveExistingReversal(companyId, originalJournal, header.reversalJournalId);
        if (header.status === 'CANCELLED' && (!stockPosted || stockReversed) && (!originalJournal || Boolean(reversalJournal))) {
            return {
                documentId: header.id,
                documentNo: header.issueNo,
                status: 'ALREADY_CANCELLED',
                isStockReversed: Boolean(stockPosted),
                isFinancialReversed: originalJournal ? Boolean(reversalJournal) : false,
                reversalJournalId: reversalJournal?.id || null,
                reversalJournalNo: reversalJournal?.journalNo || null,
            };
        }
        if (stockPosted && !stockReversed) {
            this.stockLedgerService.reverse(context, 'PRODUCTION_MATERIAL_ISSUE', header.id, reverseDate);
        }
        if (originalJournal && !reversalJournal) {
            try {
                const reversed = this.journalEngineUseCases.reverseJournal(companyId, context.userId, {
                    companyId,
                    journalId: originalJournal.id,
                    reverseDate,
                    sourceType: 'PRODUCTION_MATERIAL_ISSUE_REVERSAL',
                    sourceId: header.id,
                    sourceNo: header.issueNo,
                    sourceVersion,
                    referenceNo: header.referenceNo || header.issueNo,
                    reason: input.reason || `Cancel production issue ${header.issueNo}`,
                    postedBy: context.userId,
                });
                reversalJournal = this.journalEngineUseCases.getById(companyId, reversed.reversalJournalId);
            }
            catch (error) {
                if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                    throw error;
                }
                reversalJournal = this.resolveExistingReversal(companyId, originalJournal, header.reversalJournalId);
            }
        }
        const reverseTime = new Date().toISOString();
        this.repository.runInTransaction(() => {
            const componentRows = this.repository.listProductionOrderComponents(header.productionOrderId);
            this.repository.saveProductionIssueReversalState({
                companyId,
                branchId,
                issueId: header.id,
                reversalJournalId: reversalJournal?.id || null,
                reversedBy: context.userId,
                reversedAt: reverseTime,
                stockReversedAt: reverseTime,
                nextStatus: 'CANCELLED',
            });
            for (const line of lines) {
                const componentLineId = this.resolveIssueComponentLineId(componentRows, line);
                if (!componentLineId)
                    continue;
                this.repository.updateProductionOrderComponentProgress(header.productionOrderId, componentLineId, 0, line.qty, reverseTime);
            }
        });
        this.refreshOrderAggregates(companyId, branchId, header.productionOrderId);
        return {
            documentId: header.id,
            documentNo: header.issueNo,
            status: 'CANCELLED',
            isStockReversed: Boolean(stockPosted),
            isFinancialReversed: originalJournal ? Boolean(reversalJournal) : false,
            reversalJournalId: reversalJournal?.id || null,
            reversalJournalNo: reversalJournal?.journalNo || null,
        };
    }
    createProductionReceipt(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const orderId = this.normalizeRequired(input.productionOrderId, 'Production order id is required');
        const order = this.requireOrder(companyId, branchId, orderId);
        this.assertOrderAllowsTransactions(order, 'Production receipt cannot be created for cancelled/completed order');
        const receiptDate = this.normalizeDate(input.receiptDate, 'Receipt date is required');
        const createdBy = this.normalizeRequired(input.createdBy || context.userId, 'Created by is required');
        const lines = this.normalizeReceiptLines(input.lines || [], order);
        const now = new Date().toISOString();
        const payload = {
            id: this.repository.nextIdentity(),
            companyId,
            branchId,
            receiptNo: this.repository.nextDocumentNo(companyId, branchId, 'MFG_RECEIPT'),
            receiptDate,
            status: 'DRAFT',
            productionOrderId: order.id,
            referenceNo: this.normalizeNullable(input.referenceNo),
            remarks: this.normalizeNullable(input.remarks),
            createdBy,
            approvedBy: this.normalizeNullable(input.approvedBy),
            version: 1,
            createdAt: now,
            updatedAt: now,
            lines,
        };
        return this.repository.createProductionReceipt(payload);
    }
    getProductionReceiptById(context, receiptId) {
        return this.requireReceipt(this.normalizeRequired(context.companyId, 'Company id is required'), this.normalizeRequired(context.branchId, 'Branch id is required'), this.normalizeRequired(receiptId, 'Production receipt id is required'));
    }
    async postProductionReceipt(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const receiptId = this.normalizeRequired(input.receiptId, 'Production receipt id is required');
        const receipt = this.requireReceipt(companyId, branchId, receiptId);
        const header = receipt.header;
        const lines = receipt.lines;
        if (header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled receipt cannot be posted', {
                messageKey: 'validation.manufacturing.receipt.cancelled',
                details: { receiptId },
            });
        }
        const order = this.requireOrder(companyId, branchId, header.productionOrderId);
        this.assertOrderAllowsTransactions(order, 'Production receipt cannot be posted for cancelled/completed order');
        const sourceVersion = Number(header.version || 1) + 1;
        let journal = this.resolveOriginalJournal(companyId, {
            sourceType: 'PRODUCTION_RECEIPT',
            sourceId: header.id,
            sourceVersion,
            fallbackJournalId: header.journalId,
        });
        const stockAlreadyPosted = this.repository.hasStockLedgerPosting(companyId, 'PRODUCTION_RECEIPT', header.id, false);
        const policy = this.repository.getPolicy(companyId);
        const allowOverReceipt = input.allowOverReceipt === true || policy.allowOverReceipt;
        this.validateReceiptPostingLines(order, lines, allowOverReceipt);
        const resolvedLines = this.resolveReceiptLineCosts(order, lines);
        if (header.status === 'POSTED' && stockAlreadyPosted && (!policy.receiptAccountingEnabled || Boolean(journal))) {
            return {
                documentId: header.id,
                documentNo: header.receiptNo,
                status: 'ALREADY_POSTED',
                sourceVersion,
                isStockPosted: true,
                isFinancialPosted: policy.receiptAccountingEnabled ? Boolean(journal) : false,
                journalId: journal?.id || null,
                journalNo: journal?.journalNo || null,
            };
        }
        if (!stockAlreadyPosted) {
            this.stockLedgerService.postReceipt(context, header, resolvedLines);
        }
        if (policy.receiptAccountingEnabled && !journal) {
            const postingCommand = await this.accountingBuilder.buildReceiptJournal({
                companyId,
                branchId,
                userId: context.userId,
                sourceVersion,
                order,
                header,
                lines: resolvedLines,
            });
            if (postingCommand) {
                try {
                    const posted = this.journalEngineUseCases.postJournal(companyId, branchId, context.userId, postingCommand);
                    journal = this.journalEngineUseCases.getById(companyId, posted.journalId);
                }
                catch (error) {
                    if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                        throw error;
                    }
                    journal = this.resolveOriginalJournal(companyId, {
                        sourceType: 'PRODUCTION_RECEIPT',
                        sourceId: header.id,
                        sourceVersion,
                        fallbackJournalId: header.journalId,
                    });
                }
            }
        }
        const postingTime = new Date().toISOString();
        this.repository.saveProductionReceiptPostingState({
            companyId,
            branchId,
            receiptId: header.id,
            journalId: journal?.id || null,
            postedBy: context.userId,
            postedAt: postingTime,
            stockPostedAt: postingTime,
            nextStatus: 'POSTED',
        });
        this.refreshOrderAggregates(companyId, branchId, order.id);
        return {
            documentId: header.id,
            documentNo: header.receiptNo,
            status: stockAlreadyPosted && (!policy.receiptAccountingEnabled || Boolean(journal)) ? 'ALREADY_POSTED' : 'POSTED',
            sourceVersion,
            isStockPosted: true,
            isFinancialPosted: policy.receiptAccountingEnabled ? Boolean(journal) : false,
            journalId: journal?.id || null,
            journalNo: journal?.journalNo || null,
        };
    }
    async cancelProductionReceipt(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const receiptId = this.normalizeRequired(input.receiptId, 'Production receipt id is required');
        const reverseDate = this.normalizeDate(input.reverseDate, 'Reverse date is required');
        const receipt = this.requireReceipt(companyId, branchId, receiptId);
        const header = receipt.header;
        const sourceVersion = Number(header.version || 1) + 1;
        const stockPosted = this.repository.hasStockLedgerPosting(companyId, 'PRODUCTION_RECEIPT', header.id, false);
        const stockReversed = this.repository.hasStockLedgerPosting(companyId, 'PRODUCTION_RECEIPT', header.id, true);
        const originalJournal = this.resolveOriginalJournal(companyId, {
            sourceType: 'PRODUCTION_RECEIPT',
            sourceId: header.id,
            sourceVersion,
            fallbackJournalId: header.journalId,
        });
        let reversalJournal = this.resolveExistingReversal(companyId, originalJournal, header.reversalJournalId);
        if (header.status === 'CANCELLED' && (!stockPosted || stockReversed) && (!originalJournal || Boolean(reversalJournal))) {
            return {
                documentId: header.id,
                documentNo: header.receiptNo,
                status: 'ALREADY_CANCELLED',
                isStockReversed: Boolean(stockPosted),
                isFinancialReversed: originalJournal ? Boolean(reversalJournal) : false,
                reversalJournalId: reversalJournal?.id || null,
                reversalJournalNo: reversalJournal?.journalNo || null,
            };
        }
        if (stockPosted && !stockReversed) {
            this.stockLedgerService.reverse(context, 'PRODUCTION_RECEIPT', header.id, reverseDate);
        }
        if (originalJournal && !reversalJournal) {
            try {
                const reversed = this.journalEngineUseCases.reverseJournal(companyId, context.userId, {
                    companyId,
                    journalId: originalJournal.id,
                    reverseDate,
                    sourceType: 'PRODUCTION_RECEIPT_REVERSAL',
                    sourceId: header.id,
                    sourceNo: header.receiptNo,
                    sourceVersion,
                    referenceNo: header.referenceNo || header.receiptNo,
                    reason: input.reason || `Cancel production receipt ${header.receiptNo}`,
                    postedBy: context.userId,
                });
                reversalJournal = this.journalEngineUseCases.getById(companyId, reversed.reversalJournalId);
            }
            catch (error) {
                if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                    throw error;
                }
                reversalJournal = this.resolveExistingReversal(companyId, originalJournal, header.reversalJournalId);
            }
        }
        const reverseTime = new Date().toISOString();
        this.repository.saveProductionReceiptReversalState({
            companyId,
            branchId,
            receiptId: header.id,
            reversalJournalId: reversalJournal?.id || null,
            reversedBy: context.userId,
            reversedAt: reverseTime,
            stockReversedAt: reverseTime,
            nextStatus: 'CANCELLED',
        });
        this.refreshOrderAggregates(companyId, branchId, header.productionOrderId);
        return {
            documentId: header.id,
            documentNo: header.receiptNo,
            status: 'CANCELLED',
            isStockReversed: Boolean(stockPosted),
            isFinancialReversed: originalJournal ? Boolean(reversalJournal) : false,
            reversalJournalId: reversalJournal?.id || null,
            reversalJournalNo: reversalJournal?.journalNo || null,
        };
    }
    refreshOrderAggregates(companyId, branchId, orderId) {
        const order = this.requireOrder(companyId, branchId, orderId);
        const components = this.repository.listProductionOrderComponents(orderId);
        const qtyIssued = this.round(components.reduce((sum, component) => {
            const net = Math.max(0, Number(component.qtyIssued || 0) - Number(component.qtyReturned || 0));
            return sum + net;
        }, 0));
        const activeIssues = this.repository.listPostedActiveIssuesByOrder(orderId);
        let materialCostIssued = 0;
        for (const issue of activeIssues) {
            const lines = this.repository.listProductionIssueLines(issue.id);
            materialCostIssued += lines.reduce((sum, line) => sum + Number(line.totalCost || 0), 0);
        }
        const activeReceipts = this.repository.listPostedActiveReceiptsByOrder(orderId);
        let qtyCompleted = 0;
        let qtyScrapped = 0;
        let costCapitalized = 0;
        for (const receipt of activeReceipts) {
            const lines = this.repository.listProductionReceiptLines(receipt.id);
            qtyCompleted += lines.reduce((sum, line) => sum + Number(line.qtyReceived || 0), 0);
            qtyScrapped += lines.reduce((sum, line) => sum + Number(line.qtyScrapped || 0), 0);
            costCapitalized += lines.reduce((sum, line) => sum + Number(line.totalCost || 0), 0);
        }
        const roundedMaterial = this.round(materialCostIssued);
        const roundedCompleted = this.round(qtyCompleted);
        const roundedScrapped = this.round(qtyScrapped);
        const roundedCapitalized = this.round(costCapitalized);
        const totalWipCost = this.round(roundedMaterial + Number(order.laborCostEstimated || 0) + Number(order.machineCostEstimated || 0) - roundedCapitalized);
        const unitCostCompleted = roundedCompleted > EPSILON ? this.round(roundedCapitalized / roundedCompleted) : 0;
        const nextStatus = order.status === 'CANCELLED'
            ? 'CANCELLED'
            : this.calculateOrderStatus(order.status, order.qtyPlanned, qtyIssued, roundedCompleted, roundedScrapped, order.qtyStarted);
        this.repository.updateProductionOrderProgress({
            companyId,
            branchId,
            orderId,
            qtyIssuedDelta: this.round(qtyIssued - Number(order.qtyIssued || 0)),
            qtyCompletedDelta: this.round(roundedCompleted - Number(order.qtyCompleted || 0)),
            qtyScrappedDelta: this.round(roundedScrapped - Number(order.qtyScrapped || 0)),
            materialCostIssuedDelta: this.round(roundedMaterial - Number(order.materialCostIssued || 0)),
            costCapitalizedDelta: this.round(roundedCapitalized - Number(order.costCapitalized || 0)),
            totalWipCost,
            unitCostCompleted,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
        });
        return this.requireOrder(companyId, branchId, orderId);
    }
    calculateOrderStatus(currentStatus, qtyPlanned, qtyIssued, qtyCompleted, qtyScrapped, qtyStarted) {
        if (qtyCompleted + qtyScrapped >= qtyPlanned - EPSILON) {
            return 'COMPLETED';
        }
        if (qtyCompleted > EPSILON) {
            return 'PARTIAL';
        }
        if (qtyIssued > EPSILON || qtyStarted > EPSILON) {
            return 'IN_PROGRESS';
        }
        if (currentStatus === 'RELEASED') {
            return 'RELEASED';
        }
        return 'DRAFT';
    }
    getOrderDocumentById(companyId, branchId, orderId) {
        const header = this.requireOrder(companyId, branchId, orderId);
        const components = this.repository.listProductionOrderComponents(orderId);
        const operations = this.repository.listProductionOrderOperations(orderId);
        return { header, components, operations };
    }
    requireOrder(companyId, branchId, orderId) {
        const order = this.repository.getProductionOrderById(companyId, branchId, orderId);
        if (!order) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Production order was not found', {
                messageKey: 'validation.manufacturing.order.not_found',
                details: { orderId },
            });
        }
        return order;
    }
    requireIssue(companyId, branchId, issueId) {
        const issue = this.repository.getProductionIssueById(companyId, branchId, issueId);
        if (!issue) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Production issue was not found', {
                messageKey: 'validation.manufacturing.issue.not_found',
                details: { issueId },
            });
        }
        return issue;
    }
    requireReceipt(companyId, branchId, receiptId) {
        const receipt = this.repository.getProductionReceiptById(companyId, branchId, receiptId);
        if (!receipt) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Production receipt was not found', {
                messageKey: 'validation.manufacturing.receipt.not_found',
                details: { receiptId },
            });
        }
        return receipt;
    }
    requireBom(companyId, bomId) {
        const bom = this.repository.getBomById(companyId, bomId);
        if (!bom) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM was not found', {
                messageKey: 'validation.manufacturing.bom.not_found',
                details: { bomId },
            });
        }
        return bom;
    }
    requireRouting(companyId, routingId) {
        const routing = this.repository.getRoutingById(companyId, routingId);
        if (!routing) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Routing was not found', {
                messageKey: 'validation.manufacturing.routing.not_found',
                details: { routingId },
            });
        }
        return routing;
    }
    assertNoCircularBom(companyId, rootItemId, componentItemIds) {
        for (const componentItemId of componentItemIds) {
            if (componentItemId === rootItemId) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM cannot contain circular component references', {
                    messageKey: 'validation.manufacturing.bom.circular',
                    details: { rootItemId, componentItemId },
                });
            }
            if (this.hasBomPathToRoot(companyId, componentItemId, rootItemId, new Set())) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM circular dependency detected', {
                    messageKey: 'validation.manufacturing.bom.circular',
                    details: { rootItemId, componentItemId },
                });
            }
        }
    }
    hasBomPathToRoot(companyId, currentItemId, targetItemId, visited) {
        if (currentItemId === targetItemId)
            return true;
        if (visited.has(currentItemId))
            return false;
        visited.add(currentItemId);
        const bom = this.repository.getDefaultBomForItem(companyId, currentItemId, null);
        if (!bom || !bom.lines.length)
            return false;
        for (const line of bom.lines) {
            if (line.componentItemId === targetItemId)
                return true;
            if (this.hasBomPathToRoot(companyId, line.componentItemId, targetItemId, visited)) {
                return true;
            }
        }
        return false;
    }
    explodeBomToComponents(bom, qtyPlanned, fallbackWarehouseId) {
        if (Number(bom.header.outputQty || 0) <= 0) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM output quantity must be greater than zero', {
                messageKey: 'validation.manufacturing.bom.output_qty_required',
                details: { bomId: bom.header.id },
            });
        }
        const ratio = qtyPlanned / Number(bom.header.outputQty);
        return bom.lines.map((line, index) => {
            const baseQty = Number(line.qtyPer || 0) * ratio;
            const qtyRequired = this.round(baseQty * (1 + (Number(line.scrapPercent || 0) / 100)));
            return {
                id: this.repository.nextIdentity(),
                lineNo: index + 1,
                componentItemId: line.componentItemId,
                warehouseId: line.warehouseId || fallbackWarehouseId,
                qtyRequired,
                qtyIssued: 0,
                qtyReturned: 0,
                issueMethod: line.issueMethod,
                unitCost: null,
                totalCost: null,
                remarks: line.remarks,
            };
        });
    }
    expandRoutingOperations(routing, qtyPlanned) {
        return routing.steps.map((step, index) => ({
            id: this.repository.nextIdentity(),
            stepNo: step.stepNo || index + 1,
            workCenterCode: step.workCenterCode,
            operationCode: step.operationCode,
            status: 'PENDING',
            setupTimeMinutes: Number(step.setupTimeMinutes || 0),
            runTimeMinutes: this.round(Number(step.runTimeMinutes || 0) * qtyPlanned),
            laborCostRate: Number(step.laborCostRate || 0),
            machineCostRate: Number(step.machineCostRate || 0),
        }));
    }
    resolveIssueComponentLineId(components, line) {
        const explicitComponentId = this.normalizeNullable(line.componentLineId);
        if (explicitComponentId && components.some((component) => component.id === explicitComponentId)) {
            return explicitComponentId;
        }
        const candidates = components.filter((component) => component.componentItemId === line.componentItemId);
        return candidates.length === 1 ? candidates[0].id : null;
    }
    validateIssuePostingLines(order, lines, allowOverIssue) {
        if (!lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Production issue requires at least one line', {
                messageKey: 'validation.manufacturing.issue.lines_required',
                details: { issueId: order.id },
            });
        }
        const components = this.repository.listProductionOrderComponents(order.id);
        const componentById = new Map(components.map((component) => [component.id, component]));
        const requestedByComponent = new Map();
        for (const line of lines) {
            const qty = this.normalizePositive(line.qty, 'Issue quantity must be greater than zero');
            const explicitComponentId = this.normalizeNullable(line.componentLineId);
            let targetComponent;
            if (explicitComponentId) {
                targetComponent = componentById.get(explicitComponentId);
                if (!targetComponent) {
                    throw new errors_1.DomainError('VALIDATION_ERROR', 'Component line does not belong to production order', {
                        messageKey: 'validation.manufacturing.issue.component_line_not_found',
                        details: { issueLineId: line.id, componentLineId: explicitComponentId, orderId: order.id },
                    });
                }
            }
            else {
                const candidates = components.filter((component) => component.componentItemId === line.componentItemId);
                if (candidates.length === 1) {
                    targetComponent = candidates[0];
                }
                else if (!allowOverIssue) {
                    throw new errors_1.DomainError('VALIDATION_ERROR', 'Issue line must reference a production component line', {
                        messageKey: 'validation.manufacturing.issue.component_line_required',
                        details: { issueLineId: line.id, itemId: line.componentItemId, candidateCount: candidates.length },
                    });
                }
            }
            if (!targetComponent)
                continue;
            requestedByComponent.set(targetComponent.id, this.round((requestedByComponent.get(targetComponent.id) || 0) + qty));
        }
        if (!allowOverIssue) {
            for (const [componentId, requestedQty] of requestedByComponent.entries()) {
                const component = componentById.get(componentId);
                if (!component)
                    continue;
                const netIssued = this.round(Math.max(0, component.qtyIssued - component.qtyReturned));
                const remaining = this.round(Math.max(0, component.qtyRequired - netIssued));
                if (requestedQty - remaining > EPSILON) {
                    throw new errors_1.DomainError('VALIDATION_ERROR', 'Issue quantity exceeds remaining requirement', {
                        messageKey: 'validation.manufacturing.issue.over_issue',
                        details: {
                            componentLineId: component.id,
                            requestedQty,
                            remainingQty: remaining,
                        },
                    });
                }
            }
        }
    }
    validateReceiptPostingLines(order, lines, allowOverReceipt) {
        if (!lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Production receipt requires at least one line', {
                messageKey: 'validation.manufacturing.receipt.lines_required',
                details: { orderId: order.id },
            });
        }
        const totalReceived = this.round(lines.reduce((sum, line) => sum + Number(line.qtyReceived || 0), 0));
        if (totalReceived <= EPSILON) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Production receipt quantity must be greater than zero', {
                messageKey: 'validation.manufacturing.receipt.qty_required',
                details: { orderId: order.id },
            });
        }
        const remaining = this.round(Math.max(0, order.qtyPlanned - (order.qtyCompleted + order.qtyScrapped)));
        if (!allowOverReceipt && totalReceived - remaining > EPSILON) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Receipt quantity exceeds planned remaining quantity', {
                messageKey: 'validation.manufacturing.receipt.over_receipt',
                details: {
                    orderId: order.id,
                    requestedQty: totalReceived,
                    remainingQty: remaining,
                },
            });
        }
        for (const line of lines) {
            if (line.itemId !== order.itemId) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Receipt line item must match production order item', {
                    messageKey: 'validation.manufacturing.receipt.item_mismatch',
                    details: { orderId: order.id, lineId: line.id, itemId: line.itemId, orderItemId: order.itemId },
                });
            }
            this.assertWarehouseExists(line.warehouseId, 'Warehouse was not found or inactive');
        }
    }
    resolveReceiptLineCosts(order, lines) {
        const totalReceived = this.round(lines.reduce((sum, line) => sum + Number(line.qtyReceived || 0), 0));
        const fallbackUnitCost = totalReceived > EPSILON
            ? this.round(Math.max(0, Number(order.totalWipCost || 0)) / totalReceived)
            : 0;
        return lines.map((line) => {
            const unitCost = Number(line.unitCost || 0) > 0 ? Number(line.unitCost) : fallbackUnitCost;
            return {
                ...line,
                unitCost: this.round(unitCost),
                totalCost: this.round(Number(line.qtyReceived || 0) * unitCost),
            };
        });
    }
    normalizeBomLines(lines, rootItemId) {
        if (!lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM requires at least one component line', {
                messageKey: 'validation.manufacturing.bom.lines_required',
                details: { rootItemId },
            });
        }
        return lines.map((line, index) => {
            const componentItemId = this.normalizeRequired(line.componentItemId, 'Component item is required');
            if (componentItemId === rootItemId) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'BOM component cannot equal finished item', {
                    messageKey: 'validation.manufacturing.bom.circular',
                    details: { lineNo: index + 1, rootItemId, componentItemId },
                });
            }
            this.assertStockItemExists(componentItemId, 'Component item was not found or inactive');
            const warehouseId = this.normalizeNullable(line.warehouseId);
            if (warehouseId)
                this.assertWarehouseExists(warehouseId, 'Warehouse was not found or inactive');
            return {
                componentItemId,
                warehouseId,
                qtyPer: this.normalizePositive(line.qtyPer, 'Component quantity per output must be greater than zero'),
                scrapPercent: this.normalizeNonNegative(line.scrapPercent, 'Scrap percent must be zero or positive'),
                issueMethod: line.issueMethod === 'BACKFLUSH' ? 'BACKFLUSH' : 'MANUAL',
                remarks: this.normalizeNullable(line.remarks),
            };
        });
    }
    normalizeRoutingSteps(steps) {
        if (!steps.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Routing requires at least one step', {
                messageKey: 'validation.manufacturing.routing.steps_required',
            });
        }
        return steps.map((step, index) => ({
            workCenterCode: this.normalizeRequired(step.workCenterCode, `Work center code is required on step ${index + 1}`),
            operationCode: this.normalizeRequired(step.operationCode, `Operation code is required on step ${index + 1}`),
            setupTimeMinutes: this.normalizeNonNegative(step.setupTimeMinutes, 'Setup time must be zero or positive'),
            runTimeMinutes: this.normalizeNonNegative(step.runTimeMinutes, 'Run time must be zero or positive'),
            laborCostRate: this.normalizeNonNegative(step.laborCostRate, 'Labor cost rate must be zero or positive'),
            machineCostRate: this.normalizeNonNegative(step.machineCostRate, 'Machine cost rate must be zero or positive'),
            remarks: this.normalizeNullable(step.remarks),
        }));
    }
    normalizeIssueLines(lines, order) {
        if (!lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Production issue requires at least one line', {
                messageKey: 'validation.manufacturing.issue.lines_required',
                details: { orderId: order.id },
            });
        }
        const components = this.repository.listProductionOrderComponents(order.id);
        const componentById = new Map(components.map((row) => [row.id, row]));
        return lines.map((line, index) => {
            const componentLineId = this.normalizeNullable(line.componentLineId);
            const componentItemId = this.normalizeRequired(line.componentItemId, 'Component item is required');
            const warehouseId = this.normalizeRequired(line.warehouseId, 'Warehouse is required');
            const qty = this.normalizePositive(line.qty, 'Issue quantity must be greater than zero');
            this.assertStockItemExists(componentItemId, 'Component item was not found or inactive');
            this.assertWarehouseExists(warehouseId, 'Warehouse was not found or inactive');
            const component = componentLineId ? componentById.get(componentLineId) : null;
            if (componentLineId && !component) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Component line does not belong to production order', {
                    messageKey: 'validation.manufacturing.issue.component_line_not_found',
                    details: { lineNo: index + 1, componentLineId, orderId: order.id },
                });
            }
            if (component && component.componentItemId !== componentItemId) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Issue component item mismatch with production order component', {
                    messageKey: 'validation.manufacturing.issue.component_mismatch',
                    details: { lineNo: index + 1, componentLineId, expectedItemId: component.componentItemId, itemId: componentItemId },
                });
            }
            const item = this.repository.getItemById(componentItemId);
            const resolvedUnitCost = Number(line.unitCost || 0) > 0
                ? Number(line.unitCost)
                : Number(component?.unitCost || item?.defaultUnitCost || 0);
            const unitCost = this.round(resolvedUnitCost);
            return {
                id: this.repository.nextIdentity(),
                lineNo: index + 1,
                componentLineId,
                componentItemId,
                warehouseId,
                qty,
                unitCost,
                totalCost: this.round(qty * unitCost),
                remarks: this.normalizeNullable(line.remarks),
            };
        });
    }
    normalizeReceiptLines(lines, order) {
        if (!lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Production receipt requires at least one line', {
                messageKey: 'validation.manufacturing.receipt.lines_required',
                details: { orderId: order.id },
            });
        }
        return lines.map((line, index) => {
            const itemId = this.normalizeRequired(line.itemId, 'Receipt item is required');
            const warehouseId = this.normalizeRequired(line.warehouseId, 'Warehouse is required');
            const qtyReceived = this.normalizePositive(line.qtyReceived, 'Receipt quantity must be greater than zero');
            const qtyScrapped = this.normalizeNonNegative(line.qtyScrapped, 'Scrap quantity must be zero or positive');
            if (itemId !== order.itemId) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Receipt item must match production order item', {
                    messageKey: 'validation.manufacturing.receipt.item_mismatch',
                    details: { lineNo: index + 1, orderItemId: order.itemId, itemId },
                });
            }
            this.assertStockItemExists(itemId, 'Finished item was not found or inactive');
            this.assertWarehouseExists(warehouseId, 'Warehouse was not found or inactive');
            const item = this.repository.getItemById(itemId);
            const resolvedUnitCost = Number(line.unitCost || 0) > 0
                ? Number(line.unitCost)
                : Number(item?.defaultUnitCost || 0);
            const unitCost = this.round(resolvedUnitCost);
            return {
                id: this.repository.nextIdentity(),
                lineNo: index + 1,
                itemId,
                warehouseId,
                qtyReceived,
                qtyScrapped,
                unitCost,
                totalCost: this.round(qtyReceived * unitCost),
                remarks: this.normalizeNullable(line.remarks),
            };
        });
    }
    assertOrderAllowsTransactions(order, message) {
        if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', message, {
                messageKey: 'validation.manufacturing.order.read_only',
                details: { orderId: order.id, status: order.status },
            });
        }
    }
    assertStockItemExists(itemId, message) {
        const item = this.repository.getItemById(itemId);
        if (!item || !item.isActive || !item.isStockItem) {
            throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                messageKey: 'validation.manufacturing.item.invalid',
                details: { itemId },
            });
        }
    }
    assertWarehouseExists(warehouseId, message) {
        const warehouse = this.repository.getWarehouseById(warehouseId);
        if (!warehouse || !warehouse.isActive) {
            throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                messageKey: 'validation.manufacturing.warehouse.invalid',
                details: { warehouseId },
            });
        }
    }
    resolveOriginalJournal(companyId, input) {
        const bySource = this.journalEngineUseCases.getBySource(companyId, {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            sourceVersion: input.sourceVersion,
        }) || this.journalEngineUseCases.getBySource(companyId, {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            sourceVersion: null,
        });
        if (bySource)
            return bySource;
        if (!input.fallbackJournalId)
            return null;
        return this.journalEngineUseCases.getById(companyId, input.fallbackJournalId);
    }
    resolveExistingReversal(companyId, originalJournal, explicitReversalJournalId) {
        if (explicitReversalJournalId) {
            const explicit = this.journalEngineUseCases.getById(companyId, explicitReversalJournalId);
            if (explicit)
                return explicit;
        }
        if (!originalJournal)
            return null;
        if (originalJournal.reversedJournalId) {
            const linked = this.journalEngineUseCases.getById(companyId, originalJournal.reversedJournalId);
            if (linked)
                return linked;
        }
        const bySource = this.journalEngineUseCases.getBySource(companyId, {
            sourceType: `${originalJournal.sourceType}_REVERSAL`,
            sourceId: originalJournal.sourceId,
            sourceVersion: originalJournal.sourceVersion,
        }) || this.journalEngineUseCases.getBySource(companyId, {
            sourceType: `${originalJournal.sourceType}_REVERSAL`,
            sourceId: originalJournal.sourceId,
            sourceVersion: null,
        });
        return bySource || null;
    }
    estimateLaborCost(operation) {
        const totalMinutes = Number(operation.setupTimeMinutes || 0) + Number(operation.runTimeMinutes || 0);
        const hours = totalMinutes / 60;
        return this.round(hours * Number(operation.laborCostRate || 0));
    }
    estimateMachineCost(operation) {
        const totalMinutes = Number(operation.setupTimeMinutes || 0) + Number(operation.runTimeMinutes || 0);
        const hours = totalMinutes / 60;
        return this.round(hours * Number(operation.machineCostRate || 0));
    }
    normalizeRequired(value, message) {
        const normalized = String(value || '').trim();
        if (!normalized) {
            throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                messageKey: 'error.validation',
            });
        }
        return normalized;
    }
    normalizeNullable(value) {
        const normalized = String(value || '').trim();
        return normalized || null;
    }
    normalizeDate(value, message) {
        const normalized = String(value || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                messageKey: 'error.validation',
                details: { value: normalized },
            });
        }
        return normalized;
    }
    normalizeDateOrNull(value) {
        const normalized = this.normalizeNullable(value);
        if (!normalized)
            return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Date must be in YYYY-MM-DD format', {
                messageKey: 'error.validation',
                details: { value: normalized },
            });
        }
        return normalized;
    }
    normalizePositive(value, message) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                messageKey: 'error.validation',
                details: { value },
            });
        }
        return this.round(numeric);
    }
    normalizeNonNegative(value, message) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric < 0) {
            throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                messageKey: 'error.validation',
                details: { value },
            });
        }
        return this.round(numeric);
    }
    round(value) {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
exports.ManufacturingService = ManufacturingService;
