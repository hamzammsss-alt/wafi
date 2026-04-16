export type JobCardStatus = 'Pending' | 'Running' | 'Done';

export class JobCard {
    constructor(
        public readonly id: string,
        public readonly orderId: string,
        public readonly operationId: string | null,
        public readonly workCenterId: string | null,
        public status: JobCardStatus = 'Pending',
        public startedAt: string | null = null,
        public completedAt: string | null = null,
        public outputQty: number = 0,
        public notes: string = '',
        public readonly createdAt: string = new Date().toISOString()
    ) { }

    start(): void {
        if (this.status !== 'Pending') throw new Error('Job card is not in Pending state.');
        this.status = 'Running';
        this.startedAt = new Date().toISOString();
    }

    stop(outputQty: number, notes?: string): void {
        if (this.status !== 'Running') throw new Error('Job card is not running.');
        this.status = 'Done';
        this.completedAt = new Date().toISOString();
        this.outputQty = outputQty;
        if (notes) this.notes = notes;
    }
}
