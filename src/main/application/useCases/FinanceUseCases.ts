import { Currency } from '../../domain/entities/Currency';
import { CostCenter } from '../../domain/entities/CostCenter';
import { TaxGroup } from '../../domain/entities/TaxGroup';
import { CurrencyRepoPort } from '../../domain/ports/CurrencyRepoPort';
import { CostCenterRepoPort } from '../../domain/ports/CostCenterRepoPort';
import { TaxGroupRepoPort } from '../../domain/ports/TaxGroupRepoPort';

export class FinanceUseCases {
    constructor(
        private currencyRepo: CurrencyRepoPort,
        private costCenterRepo: CostCenterRepoPort,
        private taxGroupRepo: TaxGroupRepoPort
    ) { }

    // --- Currencies ---
    async listCurrencies(companyId: string): Promise<Currency[]> {
        return this.currencyRepo.findAll(companyId);
    }

    async saveCurrency(data: any, companyId: string): Promise<void> {
        const id = data.id || `cur_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const existing = await this.currencyRepo.findById(id, companyId);

        const name = data.name_ar || data.name || 'Unnamed';
        const symbol = data.symbol || '$';
        const decimalPlaces = data.decimal_places !== undefined ? data.decimal_places : (data.decimalPlaces || 2);
        const isActive = data.is_active !== undefined ? data.is_active : (data.isActive !== false);
        const exchangeRate = data.exchange_rate !== undefined ? data.exchange_rate : (data.exchangeRate || 1.0);
        const isBase = data.is_base !== undefined ? (data.is_base === 1 || data.is_base === true) : (data.isBaseCurrency === true);

        if (existing) {
            existing.updateDetails(name, symbol, decimalPlaces, isActive);
            if (exchangeRate !== undefined && !existing.isBaseCurrency) {
                existing.updateExchangeRate(exchangeRate);
            }
            await this.currencyRepo.update(existing);
        } else {
            const currency = new Currency(
                id,
                data.code,
                companyId,
                name,
                symbol,
                exchangeRate,
                isBase,
                isActive,
                decimalPlaces
            );
            await this.currencyRepo.create(currency);
        }
    }

    async deleteCurrency(id: string, companyId: string): Promise<void> {
        const currency = await this.currencyRepo.findById(id, companyId);
        if (currency?.isBaseCurrency) {
            throw new Error('Cannot delete base currency');
        }
        await this.currencyRepo.delete(id, companyId);
    }

    // --- Cost Centers ---
    async listCostCenters(companyId: string): Promise<CostCenter[]> {
        return this.costCenterRepo.findAll(companyId);
    }

    async saveCostCenter(data: any, companyId: string): Promise<void> {
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
        } else {
            const costCenter = new CostCenter(
                id,
                companyId,
                data.code,
                nameEn,
                isActive,
                isParent,
                nameAr,
                description,
                parentId
            );
            await this.costCenterRepo.create(costCenter);
        }
    }

    async deleteCostCenter(id: string, companyId: string): Promise<void> {
        await this.costCenterRepo.delete(id, companyId);
    }

    // --- Tax Groups ---
    async listTaxGroups(companyId: string): Promise<TaxGroup[]> {
        return this.taxGroupRepo.findAll(companyId);
    }

    async saveTaxGroup(data: any, companyId: string): Promise<void> {
        const id = data.id || `tax_${Date.now()}`;
        const existing = await this.taxGroupRepo.findById(id, companyId);

        const nameEn = data.name_en || data.nameEn || '';
        const nameAr = data.name_ar || data.nameAr || '';
        const ratePercent = data.rate !== undefined ? data.rate : (data.ratePercent || 0);
        const isActive = data.is_active !== undefined ? data.is_active : (data.isActive !== false);

        if (existing) {
            existing.updateDetails(nameEn, ratePercent, isActive, nameAr);
            await this.taxGroupRepo.update(existing);
        } else {
            const taxGroup = new TaxGroup(
                id,
                companyId,
                data.code || id,
                nameEn,
                ratePercent,
                isActive,
                nameAr
            );
            await this.taxGroupRepo.create(taxGroup);
        }
    }

    async deleteTaxGroup(id: string, companyId: string): Promise<void> {
        await this.taxGroupRepo.delete(id, companyId);
    }
}
