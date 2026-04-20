"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingOperation = void 0;
class RoutingOperation {
    constructor(id, bomId, sequence, workCenterId, operationName, setupMinutes = 0, runMinutes = 0, createdAt = new Date().toISOString()) {
        this.id = id;
        this.bomId = bomId;
        this.sequence = sequence;
        this.workCenterId = workCenterId;
        this.operationName = operationName;
        this.setupMinutes = setupMinutes;
        this.runMinutes = runMinutes;
        this.createdAt = createdAt;
    }
}
exports.RoutingOperation = RoutingOperation;
