"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSalesInvoice = validateSalesInvoice;
function validateSalesInvoice(header, lines) {
    const errors = [];
    if (!header.customer_id) {
        errors.push({ field: 'customer_id', message: 'Customer is required' });
    }
    if (!lines || lines.length === 0) {
        errors.push({ field: 'lines', message: 'At least one line item is required' });
    }
    else {
        const hasValidLine = lines.some(l => (l.item_code_lookup || l.item_code || l.item_id) && Number(l.qty || l.quantity) > 0);
        if (!hasValidLine) {
            errors.push({ field: 'lines', message: 'At least one line must have an item and quantity > 0' });
        }
        lines.forEach((l, i) => {
            const qty = Number(l.qty || l.quantity || 0);
            const price = Number(l.price || l.unit_price || 0);
            const tax = Number(l.tax_rate || 0);
            if (qty < 0)
                errors.push({ field: `lines[${i}].qty`, message: 'Quantity cannot be negative' });
            if (price < 0)
                errors.push({ field: `lines[${i}].price`, message: 'Price cannot be negative' });
            if (tax < 0 || tax > 100)
                errors.push({ field: `lines[${i}].tax_rate`, message: 'Tax rate must be between 0 and 100' });
        });
    }
    return errors;
}
