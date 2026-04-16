import { CostCenter } from '../../src/main/domain/entities/CostCenter';
import { SqliteCostCenterRepo } from '../../src/main/infrastructure/adapters/SqliteCostCenterRepo';
import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../src/main/domain/errors';
import { db } from '../database';

export class CostCenterService {
    private static repo: SqliteCostCenterRepo | null = null;

    private static getRepo(): SqliteCostCenterRepo {
        if (!this.repo) {
            if (!db) {
                throw new Error('Database is not initialized');
            }
            this.repo = new SqliteCostCenterRepo(db);
        }
        return this.repo;
    }

    static async getCostCenters(companyId: string): Promise<CostCenter[]> {
        return await this.getRepo().findAll(companyId);
    }

    static async getCostCenter(id: string, companyId: string): Promise<CostCenter> {
        const cc = await this.getRepo().findById(id, companyId);
        if (!cc) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Cost Center not found');
        }
        return cc;
    }

    static async createCostCenter(data: {
        companyId: string,
        code: string,
        nameEn: string,
        nameAr?: string,
        description?: string,
        parentId?: string,
        isParent?: boolean,
        isActive?: boolean
    }): Promise<string> {
        const id = uuidv4();
        const costCenter = new CostCenter(
            id,
            data.companyId,
            data.code,
            data.nameEn,
            data.isActive !== undefined ? data.isActive : true,
            data.isParent || false,
            data.nameAr,
            data.description,
            data.parentId
        );

        await this.getRepo().create(costCenter);
        return id;
    }

    static async updateCostCenter(
        id: string,
        companyId: string,
        updates: {
            nameEn: string;
            nameAr?: string;
            description?: string;
            isActive?: boolean;
            isParent?: boolean;
            parentId?: string;
        }
    ): Promise<{ success: true }> {
        const cc = await this.getRepo().findById(id, companyId);
        if (!cc) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Cost Center not found');
        }

        cc.updateDetails(
            updates.nameEn,
            updates.nameAr,
            updates.description,
            updates.isActive,
            updates.isParent,
            updates.parentId
        );

        await this.getRepo().update(cc);
        return { success: true };
    }

    static async deleteCostCenter(id: string, companyId: string): Promise<{ success: true }> {
        const cc = await this.getRepo().findById(id, companyId);
        if (!cc) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Cost Center not found');
        }

        // Must check if it is being used by any transaction or as a parent...
        // For now, let's keep it simple and just delete using Repo bounds.
        await this.getRepo().delete(id, companyId);

        return { success: true };
    }
}
