"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const electron_1 = require("electron");
const crypto = __importStar(require("crypto"));
class ExportService {
    constructor(db) {
        this.db = db;
        this.registerHandlers();
    }
    registerHandlers() {
        // Export Shipments (Legacy)
        electron_1.ipcMain.handle('export:get-shipments', async (event, filters) => {
            return this.getShipments(filters);
        });
        electron_1.ipcMain.handle('export:get-shipment', async (event, id) => {
            return this.getShipment(id);
        });
        electron_1.ipcMain.handle('export:save-shipment', async (event, data) => {
            return this.saveShipment(data);
        });
        electron_1.ipcMain.handle('export:delete-shipment', async (event, id) => {
            return this.deleteShipment(id);
        });
        // Export Invoices
        electron_1.ipcMain.handle('export-get-invoices', async (event, filters) => {
            return this.getExportInvoices(filters);
        });
        electron_1.ipcMain.handle('export-get-invoice', async (event, id) => {
            return this.getExportInvoice(id);
        });
        electron_1.ipcMain.handle('export-save-invoice', async (event, data) => {
            return this.saveExportInvoice(data);
        });
        electron_1.ipcMain.handle('export-delete-invoice', async (event, id) => {
            return this.deleteExportInvoice(id);
        });
        // Packing Lists
        electron_1.ipcMain.handle('export-get-packing-lists', async (event, invoiceId) => {
            return this.getPackingLists(invoiceId);
        });
        electron_1.ipcMain.handle('export-get-packing-list', async (event, id) => {
            return this.getPackingList(id);
        });
        electron_1.ipcMain.handle('export-save-packing-list', async (event, data) => {
            return this.savePackingList(data);
        });
        electron_1.ipcMain.handle('export-delete-packing-list', async (event, id) => {
            return this.deletePackingList(id);
        });
        // Certificate of Origin
        electron_1.ipcMain.handle('export-generate-coo', async (event, invoiceId) => {
            return this.generateCertificateOfOrigin(invoiceId);
        });
    }
    // ============================================================================
    // EXPORT SHIPMENTS (Legacy - for compatibility)
    // ============================================================================
    getShipments(filters) {
        let query = `
            SELECT es.*, p.name_ar as customer_name
            FROM export_shipments es
            LEFT JOIN partners p ON es.customer_id = p.id
            WHERE 1=1
        `;
        const params = [];
        query += ` ORDER BY es.created_at DESC`;
        return this.db.prepare(query).all(...params);
    }
    getShipment(id) {
        return this.db.prepare(`
            SELECT es.*, p.name_ar as customer_name
            FROM export_shipments es
            LEFT JOIN partners p ON es.customer_id = p.id
            WHERE es.id = ?
        `).get(id);
    }
    saveShipment(data) {
        const id = data.id || crypto.randomUUID();
        const isNew = !data.id;
        if (isNew) {
            this.db.prepare(`
                INSERT INTO export_shipments (
                    id, shipment_no, customer_id, invoice_id,
                    destination_country, port_of_loading, port_of_discharge,
                    loading_date, driver_details, vehicle_no, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, data.shipment_no, data.customer_id, data.invoice_id, data.destination_country, data.port_of_loading, data.port_of_discharge, data.loading_date, data.driver_details, data.vehicle_no, data.notes, 'System');
        }
        else {
            this.db.prepare(`
                UPDATE export_shipments SET
                    customer_id = ?, invoice_id = ?, destination_country = ?,
                    port_of_loading = ?, port_of_discharge = ?, loading_date = ?,
                    driver_details = ?, vehicle_no = ?, notes = ?
                WHERE id = ?
            `).run(data.customer_id, data.invoice_id, data.destination_country, data.port_of_loading, data.port_of_discharge, data.loading_date, data.driver_details, data.vehicle_no, data.notes, id);
        }
        return { success: true, id };
    }
    deleteShipment(id) {
        this.db.prepare('DELETE FROM export_shipments WHERE id = ?').run(id);
        return { success: true };
    }
    // ============================================================================
    // EXPORT INVOICES
    // ============================================================================
    getExportInvoices(filters) {
        let query = `
            SELECT ei.*, p.name_ar as customer_name
            FROM export_invoices ei
            LEFT JOIN partners p ON ei.customer_id = p.id
            WHERE 1=1
        `;
        const params = [];
        if (filters.status) {
            query += ' AND ei.status = ?';
            params.push(filters.status);
        }
        if (filters.shipment_id) {
            query += ' AND ei.shipment_id = ?';
            params.push(filters.shipment_id);
        }
        query += ' ORDER BY ei.invoice_date DESC';
        const invoices = this.db.prepare(query).all(...params);
        return invoices.map((invoice) => {
            const lines = this.db.prepare(`
                SELECT eil.*, i.name_ar as item_name
                FROM export_invoice_lines eil
                LEFT JOIN items i ON eil.item_id = i.id
                WHERE eil.invoice_id = ?
            `).all(invoice.id);
            return { ...invoice, lines };
        });
    }
    getExportInvoice(id) {
        const invoice = this.db.prepare(`
            SELECT ei.*, p.name_ar as customer_name
            FROM export_invoices ei
            LEFT JOIN partners p ON ei.customer_id = p.id
            WHERE ei.id = ?
        `).get(id);
        if (!invoice)
            return null;
        const lines = this.db.prepare(`
            SELECT eil.*, i.name_ar as item_name
            FROM export_invoice_lines eil
            LEFT JOIN items i ON eil.item_id = i.id
            WHERE eil.invoice_id = ?
        `).all(id);
        return { ...invoice, lines };
    }
    saveExportInvoice(data) {
        const { header, lines } = data;
        const id = header.id || crypto.randomUUID();
        const isNew = !header.id;
        const runTx = this.db.transaction(() => {
            if (isNew) {
                this.db.prepare(`
                    INSERT INTO export_invoices (
                        id, invoice_no, customer_id, invoice_date,
                        currency_id, exchange_rate, total_amount, payment_terms,
                        incoterms, destination_country, destination_port,
                        status, is_zero_rated, notes, created_by, shipment_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, header.invoice_no, header.customer_id, header.invoice_date, header.currency_id || 'USD', header.exchange_rate || 1, header.total_amount || 0, header.payment_terms, header.incoterms, header.destination_country, header.destination_port, header.status || 'DRAFT', header.is_zero_rated !== undefined ? header.is_zero_rated : 1, header.notes, header.created_by, header.shipment_id || null);
            }
            else {
                this.db.prepare(`
                    UPDATE export_invoices SET
                        invoice_no = ?, customer_id = ?, invoice_date = ?,
                        currency_id = ?, exchange_rate = ?, payment_terms = ?,
                        incoterms = ?, destination_country = ?, destination_port = ?,
                        status = ?, is_zero_rated = ?, notes = ?, updated_at = CURRENT_TIMESTAMP,
                        shipment_id = ?
                    WHERE id = ?
                `).run(header.invoice_no, header.customer_id, header.invoice_date, header.currency_id, header.exchange_rate, header.payment_terms, header.incoterms, header.destination_country, header.destination_port, header.status, header.is_zero_rated, header.notes, header.shipment_id || null, id);
            }
            this.db.prepare('DELETE FROM export_invoice_lines WHERE invoice_id = ?').run(id);
            const insertLine = this.db.prepare(`
                INSERT INTO export_invoice_lines (
                    id, invoice_id, item_id, description, quantity,
                    unit_price, total_price, weight_kg, volume_cbm, hs_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            lines?.forEach((line) => {
                insertLine.run(crypto.randomUUID(), id, line.item_id || null, line.description, line.quantity, line.unit_price, line.total_price, line.weight_kg || 0, line.volume_cbm || 0, line.hs_code);
            });
        });
        runTx();
        return { success: true, id };
    }
    deleteExportInvoice(id) {
        this.db.prepare('DELETE FROM export_invoices WHERE id = ?').run(id);
        return { success: true };
    }
    // ============================================================================
    // PACKING LISTS
    // ============================================================================
    getPackingLists(invoiceId) {
        return this.db.prepare(`
            SELECT * FROM packing_lists
            WHERE export_invoice_id = ?
            ORDER BY packing_date DESC
        `).all(invoiceId);
    }
    getPackingList(id) {
        const packingList = this.db.prepare(`SELECT * FROM packing_lists WHERE id = ?`).get(id);
        if (!packingList)
            return null;
        const items = this.db.prepare(`
            SELECT pli.*, i.name_ar as item_name
            FROM packing_list_items pli
            LEFT JOIN items i ON pli.item_id = i.id
            WHERE pli.packing_list_id = ?
            ORDER BY pli.package_no
        `).all(id);
        return { ...packingList, items };
    }
    savePackingList(data) {
        const { header, items } = data;
        const id = header.id || crypto.randomUUID();
        const isNew = !header.id;
        const runTx = this.db.transaction(() => {
            if (isNew) {
                this.db.prepare(`
                    INSERT INTO packing_lists (
                        id, packing_list_no, export_invoice_id, packing_date,
                        total_packages, total_gross_weight, total_net_weight,
                        total_volume, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, header.packing_list_no, header.export_invoice_id, header.packing_date, header.total_packages || 0, header.total_gross_weight || 0, header.total_net_weight || 0, header.total_volume || 0, header.notes);
            }
            else {
                this.db.prepare(`
                    UPDATE packing_lists SET
                        packing_date = ?, total_packages = ?, total_gross_weight = ?,
                        total_net_weight = ?, total_volume = ?, notes = ?
                    WHERE id = ?
                `).run(header.packing_date, header.total_packages, header.total_gross_weight, header.total_net_weight, header.total_volume, header.notes, id);
            }
            this.db.prepare('DELETE FROM packing_list_items WHERE packing_list_id = ?').run(id);
            const insertItem = this.db.prepare(`
                INSERT INTO packing_list_items (
                    id, packing_list_id, package_no, item_id, description,
                    quantity, gross_weight, net_weight, dimensions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            items?.forEach((item) => {
                insertItem.run(crypto.randomUUID(), id, item.package_no, item.item_id || null, item.description, item.quantity, item.gross_weight || 0, item.net_weight || 0, item.dimensions);
            });
        });
        runTx();
        return { success: true, id };
    }
    deletePackingList(id) {
        this.db.prepare('DELETE FROM packing_lists WHERE id = ?').run(id);
        return { success: true };
    }
    // ============================================================================
    // CERTIFICATE OF ORIGIN
    // ============================================================================
    generateCertificateOfOrigin(invoiceId) {
        const invoice = this.getExportInvoice(invoiceId);
        if (!invoice)
            return { success: false, error: 'Invoice not found' };
        const cooData = {
            invoice_no: invoice.invoice_no,
            invoice_date: invoice.invoice_date,
            customer_name: invoice.customer_name,
            destination_country: invoice.destination_country,
            destination_port: invoice.destination_port,
            items: invoice.lines.map((line) => ({
                description: line.description,
                quantity: line.quantity,
                hs_code: line.hs_code,
                origin: 'Palestine'
            })),
            total_packages: invoice.lines.length,
            total_gross_weight: invoice.lines.reduce((sum, line) => sum + (line.weight_kg || 0), 0),
            generated_date: new Date().toISOString().split('T')[0]
        };
        return { success: true, data: cooData };
    }
}
exports.ExportService = ExportService;
