export class WorkCenter {
    constructor(
        public readonly id: string,
        public readonly companyId: string,
        public code: string,
        public name: string,
        public capacity: number = 1,        // units per day
        public costPerHour: number = 0,
        public isActive: boolean = true,
        public readonly createdAt: string = new Date().toISOString()
    ) { }
}
