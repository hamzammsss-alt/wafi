"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Currency = void 0;
const errors_1 = require("../errors");
class Currency {
    constructor(id, code, companyId, name, symbol, exchangeRate, isBaseCurrency, isActive, decimalPlaces = 2, nameAr, nameEn, isFixedRate = false, lastUpdate) {
        this.id = id;
        this.code = code;
        this.companyId = companyId;
        this.name = name;
        this.symbol = symbol;
        this.exchangeRate = exchangeRate;
        this.isBaseCurrency = isBaseCurrency;
        this.isActive = isActive;
        this.decimalPlaces = decimalPlaces;
        if (!code || code.trim() === '')
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Currency code is required');
        if (!name || name.trim() === '')
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Currency name is required');
        if (exchangeRate <= 0)
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Exchange rate must be greater than zero');
        this.nameAr = this.normalizeArabicName(nameAr, name);
        this.nameEn = this.normalizeOptionalName(nameEn);
        this.isFixedRate = Boolean(isFixedRate) || Boolean(isBaseCurrency);
        this.lastUpdate = typeof lastUpdate === 'string' && lastUpdate.trim() !== '' ? lastUpdate : null;
    }
    updateDetails(name, symbol, decimalPlaces, isActive, nameAr, nameEn) {
        if (!name || name.trim() === '')
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Currency name cannot be empty');
        this.name = name;
        this.symbol = symbol;
        this.decimalPlaces = decimalPlaces;
        this.isActive = isActive;
        this.nameAr = this.normalizeArabicName(nameAr, name);
        this.nameEn = this.normalizeOptionalName(nameEn);
    }
    updateExchangeRate(rate) {
        if (this.isBaseCurrency) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Cannot update exchange rate of base currency. It is always 1');
        }
        if (rate <= 0)
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Exchange rate must be greater than zero');
        this.exchangeRate = rate;
    }
    normalizeArabicName(value, fallback) {
        const normalized = typeof value === 'string' ? value.trim() : '';
        return normalized || fallback;
    }
    normalizeOptionalName(value) {
        return typeof value === 'string' ? value.trim() : '';
    }
}
exports.Currency = Currency;
