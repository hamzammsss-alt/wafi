import { TaxGroup } from '../entities/TaxGroup';

export interface TaxGroupRepoPort {
    findById(id: string, companyId: string): Promise<TaxGroup | null>;
    findAll(companyId: string): Promise<TaxGroup[]>;
    create(taxGroup: TaxGroup): Promise<void>;
    update(taxGroup: TaxGroup): Promise<void>;
    delete(id: string, companyId: string): Promise<void>;
}
