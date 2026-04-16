export class Money {
    static round(amount: number): number {
        return Math.round((amount + Number.EPSILON) * 100) / 100;
    }
}
