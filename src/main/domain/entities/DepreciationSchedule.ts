export class DepreciationSchedule {
    constructor(
        public readonly id: string,
        public readonly assetId: string,
        public readonly periodDate: string,   // 'YYYY-MM-DD' — the period this entry covers
        public readonly amount: number,
        public readonly journalEntryId: string | null = null,
        public readonly createdAt: string = new Date().toISOString()
    ) { }
}
