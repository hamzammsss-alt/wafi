"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSalesInvoiceTotals = computeSalesInvoiceTotals;
function computeSalesInvoiceTotals(lines) {
    let total_before_tax = 0;
    let tax_total = 0;
    let grand_total = 0;
    const computedLines = lines.map(line => {
        const qty = Number(line.qty || line.quantity || 0);
        const price = Number(line.price || line.unit_price || 0);
        const discount = Number(line.discount || 0);
        const taxRate = Number(line.tax_rate || 0);
        const gross = qty * price;
        const net_after_discount = gross * (1 - (discount / 100));
        const tax_amount = net_after_discount * (taxRate / 100);
        const line_total = net_after_discount + tax_amount;
        total_before_tax += net_after_discount;
        tax_total += tax_amount;
        grand_total += line_total;
        return {
            ...line,
            // Re-assign generic or internal mapped names back
            total_price: Number(net_after_discount.toFixed(2)),
            tax_amount: Number(tax_amount.toFixed(2)),
            net_total: Number(line_total.toFixed(2)),
            // Useful for frontend generic display:
            line_total: Number(line_total.toFixed(2))
        };
    });
    return {
        lines: computedLines,
        totals: {
            subtotal: Number(total_before_tax.toFixed(2)),
            tax_total: Number(tax_total.toFixed(2)),
            grand_total: Number(grand_total.toFixed(2))
        }
    };
}
