"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
class Money {
    static round(amount) {
        return Math.round((amount + Number.EPSILON) * 100) / 100;
    }
}
exports.Money = Money;
