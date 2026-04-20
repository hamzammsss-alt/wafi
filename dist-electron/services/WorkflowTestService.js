"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowTestService = void 0;
const uuid_1 = require("uuid");
const PurchaseService_1 = require("./PurchaseService");
const InventoryService_1 = require("./InventoryService");
const ManufacturingService_1 = require("./ManufacturingService");
const PartnerService_1 = require("./PartnerService");
class WorkflowTestService {
    static async runFullWorkflow() {
        const logs = [];
        const log = (msg) => {
            console.log(`[TEST] ${msg}`);
            logs.push(msg);
        };
        try {
            log("Starting Full Workflow Simulation...");
            // ==========================================
            // 1. SETUP MASTER DATA
            // ==========================================
            log("1. Setting up Master Data...");
            // 1.1 Warehouse
            const warehouseId = InventoryService_1.InventoryService.createWarehouse({
                name_ar: 'Test Warehouse',
                name_en: 'Test Warehouse',
                code: 'WH-TEST-' + Date.now().toString().slice(-4),
                is_active: 1
            });
            log(`- Created Warehouse: ${warehouseId}`);
            // 1.2 Supplier
            // PartnerService.createPartner generates UUID internally, do not pass ID
            const supplierId = PartnerService_1.PartnerService.createPartner({
                name_ar: 'Test Supplier',
                code: 'SUP-TEST-' + Date.now().toString().slice(-4),
                type: 'SUPPLIER',
                is_active: 1
            });
            log(`- Created Supplier: ${supplierId}`);
            // 1.3 Items
            // Raw Material A
            const itemAId = (0, uuid_1.v4)();
            InventoryService_1.InventoryService.createItem({
                id: itemAId,
                code: 'RM-A-' + Date.now().toString().slice(-4),
                name_ar: 'Raw Material A',
                type: 'Goods',
                cost_price: 10,
                sale_price: 15,
                is_active: 1
            });
            log(`- Created Item A: ${itemAId}`);
            // Raw Material B
            const itemBId = (0, uuid_1.v4)();
            InventoryService_1.InventoryService.createItem({
                id: itemBId,
                code: 'RM-B-' + Date.now().toString().slice(-4),
                name_ar: 'Raw Material B',
                type: 'Goods',
                cost_price: 20,
                sale_price: 30,
                is_active: 1
            });
            log(`- Created Item B: ${itemBId}`);
            // Finished Good
            const itemFGId = (0, uuid_1.v4)();
            InventoryService_1.InventoryService.createItem({
                id: itemFGId,
                code: 'FG-TEST-' + Date.now().toString().slice(-4),
                name_ar: 'Finished Good Test',
                type: 'Goods', // Or Manufactured? 
                cost_price: 0, // Will be calculated
                sale_price: 100,
                is_active: 1,
                production_line: 'Factory 1'
            });
            log(`- Created Item FG: ${itemFGId}`);
            // 1.4 BOM
            // FG requires 2 of A and 1 of B
            const bomResult = ManufacturingService_1.ManufacturingService.createBOM({
                item_id: itemFGId,
                batch_size: 1,
                type: 'PRODUCTION',
                is_default: true,
                notes: 'Test BOM'
            }, [
                { item_id: itemAId, quantity: 2, scarp_percentage: 0 },
                { item_id: itemBId, quantity: 1, scarp_percentage: 0 }
            ]);
            log(`- Created BOM: ${bomResult.bom_number}`);
            // ==========================================
            // 2. PURCHASING CYCLE
            // ==========================================
            log("2. Starting Purchasing Cycle...");
            // 2.1 Purchase Request
            const prLineA = { item_id: itemAId, quantity: 100, unit_id: 'UNIT-ID-HERE', description: 'Need A' }; // Assuming units exist? 
            // Wait, I need a valid unit ID.
            const units = InventoryService_1.InventoryService.getUnits();
            const unitId = units[0]?.id || '1'; // Fallback
            const prResult = PurchaseService_1.PurchaseService.createRequest({
                header: {
                    id: (0, uuid_1.v4)(),
                    request_no: 'NEW',
                    branch_id: '1',
                    warehouse_id: warehouseId,
                    date: new Date().toISOString().split('T')[0],
                    needed_date: new Date().toISOString().split('T')[0],
                    status: 'DRAFT',
                    requester_id: '1' // Admin
                },
                lines: [
                    { id: (0, uuid_1.v4)(), request_id: '', item_id: itemAId, quantity: 100, unit_id: unitId, description: 'Material A' },
                    { id: (0, uuid_1.v4)(), request_id: '', item_id: itemBId, quantity: 100, unit_id: unitId, description: 'Material B' }
                ]
            });
            log(`- Created PR: ${prResult.request_no}`);
            // 2.2 Purchase Order (Conversion)
            const poResult = PurchaseService_1.PurchaseService.createOrder({
                header: {
                    order_no: 'NEW',
                    supplier_id: supplierId,
                    branch_id: '1',
                    date: new Date().toISOString().split('T')[0],
                    currency_id: 'ILS',
                    exchange_rate: 1,
                    request_id: prResult.id,
                    subtotal: 3000,
                    tax_total: 480,
                    grand_total: 3480
                },
                lines: [
                    { item_id: itemAId, quantity: 100, unit_id: unitId, unit_price: 10, total: 1000, tax_amount: 160 },
                    { item_id: itemBId, quantity: 100, unit_id: unitId, unit_price: 20, total: 2000, tax_amount: 320 }
                ]
            });
            log(`- Created PO: ${poResult.order_no}`);
            // 2.3 Purchase Invoice (Receipt)
            const piResult = PurchaseService_1.PurchaseService.createInvoice({
                header: {
                    invoice_no: 'NEW',
                    supplier_id: supplierId,
                    branch_id: '1',
                    warehouse_id: warehouseId,
                    date: new Date().toISOString().split('T')[0],
                    currency_id: 'ILS',
                    exchange_rate: 1,
                    subtotal: 3000,
                    tax_total: 480,
                    grand_total: 3480,
                    status: 'POSTED'
                },
                lines: [
                    { item_id: itemAId, quantity: 100, unit_id: unitId, unit_price: 10, total: 1000, tax_amount: 160 },
                    { item_id: itemBId, quantity: 100, unit_id: unitId, unit_price: 20, total: 2000, tax_amount: 320 }
                ]
            });
            log(`- Created Purchase Invoice: ${piResult.invoice_no}`);
            // 2.4 Verify Stock
            const stockA = InventoryService_1.InventoryService.getStock(itemAId, warehouseId);
            const stockB = InventoryService_1.InventoryService.getStock(itemBId, warehouseId);
            log(`- Stock Check A: ${stockA.quantity} (Expected 100)`);
            log(`- Stock Check B: ${stockB.quantity} (Expected 100)`);
            if (stockA.quantity !== 100 || stockB.quantity !== 100) {
                throw new Error("Stock verification after Purchase failed!");
            }
            // ==========================================
            // 3. MANUFACTURING CYCLE
            // ==========================================
            log("3. Starting Manufacturing Cycle...");
            // 3.1 Production Order
            const mfgResult = ManufacturingService_1.ManufacturingService.createProductionOrder({
                bom_id: bomResult.id, // Wait, createBOM returns ID? Yes. 
                item_id: itemFGId, // This is optional in params if BOM has item_id? No, order needs item_id
                quantity: 10,
                start_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                branch_id: '1',
                warehouse_id: warehouseId
            });
            log(`- Created Production Order: ${mfgResult.order_number}`);
            // 3.2 Execute (Release & Complete)
            // Expecting Consumption: 
            // 10 FG * 2 A = 20 A
            // 10 FG * 1 B = 10 B
            ManufacturingService_1.ManufacturingService.executeProductionOrder(mfgResult.id, 10, new Date().toISOString());
            log(`- Executed Production Order`);
            // 3.3 Verify Final Stock
            const finalStockA = InventoryService_1.InventoryService.getStock(itemAId, warehouseId);
            const finalStockB = InventoryService_1.InventoryService.getStock(itemBId, warehouseId);
            const finalStockFG = InventoryService_1.InventoryService.getStock(itemFGId, warehouseId);
            log(`- Final Stock A: ${finalStockA.quantity} (Expected 80)`);
            log(`- Final Stock B: ${finalStockB.quantity} (Expected 90)`);
            log(`- Final Stock FG: ${finalStockFG.quantity} (Expected 10)`);
            if (finalStockA.quantity !== 80)
                throw new Error("Stock A consumption mismatch");
            if (finalStockB.quantity !== 90)
                throw new Error("Stock B consumption mismatch");
            if (finalStockFG.quantity !== 10)
                throw new Error("Stock FG production mismatch");
            log("SUCCESS! All steps completed correctly.");
            return { success: true, logs };
        }
        catch (error) {
            log(`ERROR: ${error.message}`);
            return { success: false, logs, error: error.message };
        }
    }
}
exports.WorkflowTestService = WorkflowTestService;
