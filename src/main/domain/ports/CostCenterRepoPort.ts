import { CostCenter } from '../../domain/entities/CostCenter';

export interface CostCenterRepoPort {
    findById(id: string, companyId: string): Promise<CostCenter | null>;
    findAll(companyId: string): Promise<CostCenter[]>;
    create(costCenter: CostCenter): Promise<void>;
    update(costCenter: CostCenter): Promise<void>;
    delete(id: string, companyId: string): Promise<void>;
}
