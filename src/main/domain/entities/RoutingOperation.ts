export class RoutingOperation {
    constructor(
        public readonly id: string,
        public readonly bomId: string,
        public sequence: number,
        public workCenterId: string,
        public operationName: string,
        public setupMinutes: number = 0,
        public runMinutes: number = 0,
        public readonly createdAt: string = new Date().toISOString()
    ) { }
}
