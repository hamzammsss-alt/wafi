export enum DocumentStatus {
    DRAFT = 'DRAFT',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    POSTED = 'POSTED',
    CANCELLED = 'CANCELLED'
}

export abstract class DocumentBase {
    constructor(
        public readonly id: string,
        public readonly companyId: string,
        public readonly branchId: string,
        public date: string,
        public status: DocumentStatus,
        public reference: string | null = null
    ) { }

    public isPosted(): boolean {
        return this.status === DocumentStatus.POSTED;
    }

    public isDraft(): boolean {
        return this.status === DocumentStatus.DRAFT;
    }

    public setStatus(newStatus: DocumentStatus): void {
        if (this.isPosted() && newStatus !== DocumentStatus.CANCELLED) {
            throw new Error(`Cannot change status from POSTED to ${newStatus}`);
        }
        this.status = newStatus;
    }
}
