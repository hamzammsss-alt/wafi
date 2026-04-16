import { TaxGroup } from '../../src/main/domain/entities/TaxGroup';
import { SqliteTaxGroupRepo } from '../../src/main/infrastructure/adapters/SqliteTaxGroupRepo';
import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../src/main/domain/errors';

export class TaxGroupService {
    private static repo = new SqliteTaxGroupRepo();

    static async getTaxGroups(companyId: string): Promise<TaxGroup[]> {
        return await this.repo.findAll(companyId);
    }

    static async getTaxGroup(id: string, companyId: string): Promise<TaxGroup> {
        const taxGroup = await this.repo.findById(id, companyId);
        if (!taxGroup) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Tax Group not found');
        }
        return taxGroup;
    }

    static async createTaxGroup(data: {
        companyId: string,
        code: string,
        nameEn: string,
        ratePercent: number,
        nameAr?: string,
        isActive?: boolean
    }): Promise<string> {
        const id = uuidv4();
        const taxGroup = new TaxGroup(
            id,
            data.companyId,
            data.code,
            data.nameEn,
            data.ratePercent,
            data.isActive !== undefined ? data.isActive : true,
            data.nameAr
        );

        await this.repo.create(taxGroup);
        return id;
    }

    static async updateTaxGroup(
        id: string,
        companyId: string,
        updates: {
            nameEn: string;
            ratePercent: number;
            nameAr?: string;
            isActive?: boolean;
        }
    ): Promise<{ success: true }> {
        const taxGroup = await this.repo.findById(id, companyId);
        if (!taxGroup) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Tax Group not found');
        }

        taxGroup.updateDetails(
            updates.nameEn,
            updates.ratePercent,
            updates.isActive !== undefined ? updates.isActive : taxGroup.isActive,
            updates.nameAr
        );

        await this.repo.update(taxGroup);
        return { success: true };
    }

    static async deleteTaxGroup(id: string, companyId: string): Promise<{ success: true }> {
        const taxGroup = await this.repo.findById(id, companyId);
        if (!taxGroup) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Tax Group not found');
        }

        await this.repo.delete(id, companyId);

        return { success: true };
    }
}
