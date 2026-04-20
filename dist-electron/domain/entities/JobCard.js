"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobCard = void 0;
class JobCard {
    constructor(id, orderId, operationId, workCenterId, status = 'Pending', startedAt = null, completedAt = null, outputQty = 0, notes = '', createdAt = new Date().toISOString()) {
        this.id = id;
        this.orderId = orderId;
        this.operationId = operationId;
        this.workCenterId = workCenterId;
        this.status = status;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.outputQty = outputQty;
        this.notes = notes;
        this.createdAt = createdAt;
    }
    start() {
        if (this.status !== 'Pending')
            throw new Error('Job card is not in Pending state.');
        this.status = 'Running';
        this.startedAt = new Date().toISOString();
    }
    stop(outputQty, notes) {
        if (this.status !== 'Running')
            throw new Error('Job card is not running.');
        this.status = 'Done';
        this.completedAt = new Date().toISOString();
        this.outputQty = outputQty;
        if (notes)
            this.notes = notes;
    }
}
exports.JobCard = JobCard;
