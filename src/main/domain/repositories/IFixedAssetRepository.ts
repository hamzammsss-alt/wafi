import { FixedAsset } from '../entities/FixedAsset';
import { DepreciationSchedule } from '../entities/DepreciationSchedule';

export interface IFixedAssetRepository {
    nextIdentity(): string;
    save(asset: FixedAsset): Promise<void>;
    findById(id: string): Promise<FixedAsset | null>;
    findByCompany(companyId: string): Promise<FixedAsset[]>;
    delete(id: string): Promise<void>;
    saveDepreciationSchedule(entry: DepreciationSchedule): Promise<void>;
    findSchedulesByAsset(assetId: string): Promise<DepreciationSchedule[]>;
}
