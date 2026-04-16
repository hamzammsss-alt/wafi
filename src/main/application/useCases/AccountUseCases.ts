import { UnitOfWork, AccountsRepositoryPort } from '../ports/AccountingPorts';
import { Account } from '../../domain/entities/Account';
import { AccountId } from '../../domain/valueObjects/AccountId';

export class AccountUseCases {
    constructor(
        private uow: UnitOfWork,
        private accountsRepo: AccountsRepositoryPort
    ) { }

    async createAccount(companyId: string, branchId: string, data: any): Promise<Account> {
        return this.uow.runInTransaction(async () => {
            const id = this.accountsRepo.nextIdentity();
            const parentId = data.parentId ? new AccountId(data.parentId) : null;

            const account = new Account(
                id,
                companyId,
                branchId,
                data.number,
                data.name,
                data.type,
                data.nature,
                parentId,
                data.isActive ?? true,
                data.isGroup ?? false
            );

            await this.accountsRepo.save(account);
            return account;
        });
    }

    async listAccounts(companyId: string): Promise<Account[]> {
        return this.accountsRepo.list(companyId);
    }
}
