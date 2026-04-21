"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceUseCases = void 0;
const Currency_1 = require("../../domain/entities/Currency");
const CostCenter_1 = require("../../domain/entities/CostCenter");
const TaxGroup_1 = require("../../domain/entities/TaxGroup");
class FinanceUseCases {
    constructor(currencyRepo, costCenterRepo, taxGroupRepo) {
        this.currencyRepo = currencyRepo;
        this.costCenterRepo = costCenterRepo;
        this.taxGroupRepo = taxGroupRepo;
    }
    // --- Currencies ---
    async listCurrencies(companyId) {
        const currencies = await this.currencyRepo.findAll(companyId);
        const deduplicated = new Map();
        for (const currency of currencies) {
            const key = this.normalizeCurrencyCode(currency.code);
            const current = deduplicated.get(key);
            if (!current || this.shouldPreferCurrency(currency, current)) {
                deduplicated.set(key, currency);
            }
        }
        return Array.from(deduplicated.values()).map(currency => this.toCurrencyDto(currency));
    }
    async saveCurrency(data, companyId) {
        const id = data.id || `cur_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const existing = await this.currencyRepo.findById(id, companyId);
        const code = this.normalizeCurrencyCode(data.code);
        const nameAr = this.normalizeText(data.name_ar) ||
            this.normalizeText(data.nameAr) ||
            this.normalizeText(data.name) ||
            this.normalizeText(data.name_en) ||
            this.normalizeText(data.nameEn);
        const nameEn = this.normalizeText(data.name_en) || this.normalizeText(data.nameEn);
        const name = nameAr || nameEn || code;
        const symbol = this.normalizeText(data.symbol) || '$';
        const decimalPlaces = this.toPositiveInteger(data.decimal_places !== undefined ? data.decimal_places : data.decimalPlaces, 2);
        const isActive = data.is_active !== undefined ? Boolean(data.is_active) : (data.isActive !== false);
        const requestedRate = data.exchange_rate !== undefined ? Number(data.exchange_rate) : Number(data.exchangeRate ?? 1.0);
        const isBase = data.is_base !== undefined ? (data.is_base === 1 || data.is_base === true) : (data.isBaseCurrency === true);
        const isFixedRequested = data.is_fixed !== undefined
            ? (data.is_fixed === 1 || data.is_fixed === true)
            : (data.isFixedRate === true);
        const isFixed = isBase ? true : isFixedRequested;
        const exchangeRate = isBase ? 1 : (Number.isFinite(requestedRate) && requestedRate > 0 ? requestedRate : 1);
        if (!code) {
            throw new Error('Currency code is required');
        }
        if (!nameAr) {
            throw new Error('Currency Arabic name is required');
        }
        const currencies = await this.currencyRepo.findAll(companyId);
        const duplicate = currencies.find(currency => currency.id !== id && this.normalizeCurrencyCode(currency.code) === code);
        if (duplicate) {
            if (code === 'ILS') {
                throw new Error('عملة الشيكل موجودة بالفعل ولا يمكن تكرارها');
            }
            throw new Error(`العملة ${code} موجودة بالفعل`);
        }
        if (isBase) {
            await this.clearPreviousBaseCurrency(companyId, id);
        }
        if (existing) {
            const previousRate = existing.exchangeRate;
            const previousFixed = existing.isFixedRate;
            const previousBase = existing.isBaseCurrency;
            existing.updateDetails(name, symbol, decimalPlaces, isActive, nameAr, nameEn);
            existing.isBaseCurrency = isBase;
            existing.isFixedRate = isFixed;
            if (isBase) {
                existing.exchangeRate = 1;
            }
            else {
                existing.updateExchangeRate(exchangeRate);
            }
            await this.currencyRepo.update(existing);
            if (this.shouldWriteRateHistory(previousRate, existing.exchangeRate, previousFixed, isFixed, previousBase, isBase)) {
                await this.currencyRepo.saveRateHistory({
                    currencyId: existing.id,
                    companyId,
                    currencyCode: code,
                    rate: existing.exchangeRate,
                    source: 'MANUAL',
                    isFixed,
                });
            }
        }
        else {
            const currency = new Currency_1.Currency(id, code, companyId, name, symbol, exchangeRate, isBase, isActive, decimalPlaces, nameAr, nameEn, isFixed);
            await this.currencyRepo.create(currency);
            await this.currencyRepo.saveRateHistory({
                currencyId: currency.id,
                companyId,
                currencyCode: code,
                rate: currency.exchangeRate,
                source: 'MANUAL',
                isFixed,
            });
        }
    }
    async listCurrencyHistory(code, companyId, days = 30) {
        const normalizedCode = this.normalizeCurrencyCode(code);
        if (!normalizedCode)
            return [];
        const rows = await this.currencyRepo.getRateHistory(normalizedCode, companyId, days);
        return rows.map(row => ({
            id: row.id,
            code: row.currencyCode,
            date: row.date,
            rate: row.rate,
            source: row.source,
            recordedAt: row.recordedAt,
            is_fixed: row.isFixed ? 1 : 0,
        }));
    }
    async listCurrencyTimeline(code, companyId, limit = 20) {
        const normalizedCode = this.normalizeCurrencyCode(code);
        if (!normalizedCode)
            return [];
        const rows = await this.currencyRepo.getRateTimeline(normalizedCode, companyId, limit);
        return rows.map(row => ({
            id: row.id,
            code: row.currencyCode,
            date: row.date,
            rate: row.rate,
            source: row.source,
            recordedAt: row.recordedAt,
            is_fixed: row.isFixed ? 1 : 0,
        }));
    }
    async deleteCurrency(id, companyId) {
        const currency = await this.currencyRepo.findById(id, companyId);
        if (!currency) {
            throw new Error('Currency not found');
        }
        if (currency?.isBaseCurrency) {
            throw new Error('Cannot delete base currency');
        }
        const usage = await this.currencyRepo.getUsageSummary(id);
        if (usage.length > 0) {
            const usageText = usage
                .map(item => `${this.getCurrencyUsageLabel(item.table)} (${item.count})`)
                .join('، ');
            throw new Error(`لا يمكن حذف العملة لأنها مستخدمة في: ${usageText}`);
        }
        await this.currencyRepo.delete(id, companyId);
    }
    // --- Cost Centers ---
    async listCostCenters(companyId) {
        return this.costCenterRepo.findAll(companyId);
    }
    async saveCostCenter(data, companyId) {
        const id = data.id || `cc_${Date.now()}`;
        const existing = await this.costCenterRepo.findById(id, companyId);
        const nameEn = data.name_en || data.nameEn || '';
        const nameAr = data.name_ar || data.nameAr || '';
        const description = data.description || '';
        const parentId = data.parent_id || data.parentId || null;
        const isActive = data.is_active !== undefined ? data.is_active : (data.isActive !== false);
        const isParent = data.is_parent !== undefined ? data.is_parent : (data.isParent === true);
        if (existing) {
            existing.nameEn = nameEn;
            existing.nameAr = nameAr;
            existing.description = description;
            existing.parentId = parentId;
            existing.isActive = isActive;
            existing.isParent = isParent;
            await this.costCenterRepo.update(existing);
        }
        else {
            const costCenter = new CostCenter_1.CostCenter(id, companyId, data.code, nameEn, isActive, isParent, nameAr, description, parentId);
            await this.costCenterRepo.create(costCenter);
        }
    }
    async deleteCostCenter(id, companyId) {
        await this.costCenterRepo.delete(id, companyId);
    }
    // --- Tax Groups ---
    async listTaxGroups(companyId) {
        return this.taxGroupRepo.findAll(companyId);
    }
    async saveTaxGroup(data, companyId) {
        const id = data.id || `tax_${Date.now()}`;
        const existing = await this.taxGroupRepo.findById(id, companyId);
        const nameEn = data.name_en || data.nameEn || '';
        const nameAr = data.name_ar || data.nameAr || '';
        const ratePercent = data.rate !== undefined ? data.rate : (data.ratePercent || 0);
        const isActive = data.is_active !== undefined ? data.is_active : (data.isActive !== false);
        if (existing) {
            existing.updateDetails(nameEn, ratePercent, isActive, nameAr);
            await this.taxGroupRepo.update(existing);
        }
        else {
            const taxGroup = new TaxGroup_1.TaxGroup(id, companyId, data.code || id, nameEn, ratePercent, isActive, nameAr);
            await this.taxGroupRepo.create(taxGroup);
        }
    }
    async deleteTaxGroup(id, companyId) {
        await this.taxGroupRepo.delete(id, companyId);
    }
    async clearPreviousBaseCurrency(companyId, currentId) {
        const currencies = await this.currencyRepo.findAll(companyId);
        for (const currency of currencies) {
            if (!currency.isBaseCurrency || currency.id === currentId)
                continue;
            currency.isBaseCurrency = false;
            currency.isFixedRate = false;
            await this.currencyRepo.update(currency);
        }
    }
    toCurrencyDto(currency) {
        return {
            id: currency.id,
            code: this.normalizeCurrencyCode(currency.code),
            company_id: currency.companyId,
            companyId: currency.companyId,
            name: currency.name,
            name_ar: currency.nameAr || currency.name,
            nameAr: currency.nameAr || currency.name,
            name_en: currency.nameEn || '',
            nameEn: currency.nameEn || '',
            symbol: currency.symbol || '',
            exchange_rate: currency.exchangeRate,
            exchangeRate: currency.exchangeRate,
            is_base: currency.isBaseCurrency ? 1 : 0,
            isBaseCurrency: currency.isBaseCurrency,
            is_fixed: currency.isFixedRate ? 1 : 0,
            isFixedRate: currency.isFixedRate,
            is_active: currency.isActive ? 1 : 0,
            isActive: currency.isActive,
            decimal_places: currency.decimalPlaces,
            decimalPlaces: currency.decimalPlaces,
            last_update: currency.lastUpdate || null,
        };
    }
    normalizeText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }
    normalizeCurrencyCode(value) {
        const normalized = this.normalizeText(value).toUpperCase();
        if (!normalized)
            return '';
        if (normalized === 'NIS')
            return 'ILS';
        return normalized;
    }
    toPositiveInteger(value, fallback) {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
    }
    shouldWriteRateHistory(previousRate, nextRate, previousFixed, nextFixed, previousBase, nextBase) {
        if (previousBase !== nextBase)
            return true;
        if (previousFixed !== nextFixed)
            return true;
        return Math.abs(Number(previousRate || 0) - Number(nextRate || 0)) > 0.0000001;
    }
    shouldPreferCurrency(candidate, current) {
        const candidateBase = candidate.isBaseCurrency ? 1 : 0;
        const currentBase = current.isBaseCurrency ? 1 : 0;
        if (candidateBase !== currentBase) {
            return candidateBase > currentBase;
        }
        const candidateCanonical = this.normalizeCurrencyCode(candidate.code);
        const currentCanonical = this.normalizeCurrencyCode(current.code);
        if (candidateCanonical === 'ILS' && currentCanonical === 'ILS') {
            const candidateIsCanonicalCode = this.normalizeText(candidate.code).toUpperCase() === 'ILS' ? 1 : 0;
            const currentIsCanonicalCode = this.normalizeText(current.code).toUpperCase() === 'ILS' ? 1 : 0;
            if (candidateIsCanonicalCode !== currentIsCanonicalCode) {
                return candidateIsCanonicalCode > currentIsCanonicalCode;
            }
        }
        return false;
    }
    getCurrencyUsageLabel(tableName) {
        const labels = {
            bank_accounts: 'الحسابات البنكية',
            currency_rates_history: 'سجل أسعار الصرف',
            gl_chart_of_accounts: 'شجرة الحسابات',
            journal_entries: 'قيود اليومية',
        };
        return labels[tableName] || tableName;
    }
}
exports.FinanceUseCases = FinanceUseCases;
