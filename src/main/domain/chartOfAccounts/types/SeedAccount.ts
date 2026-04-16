import { AccountCategory } from '../enums/AccountCategory';
import { AccountSubtype } from '../enums/AccountSubtype';
import { NormalBalance } from '../enums/NormalBalance';

export interface SeedAccount {
    code: string;
    name: string;
    category: AccountCategory;
    subtype: AccountSubtype;
    parentCode: string | null;
    isPosting: boolean;
    normalBalance: NormalBalance;
    systemTag: string | null;
    allowManualEntry: boolean;
    isActive: boolean;
}

