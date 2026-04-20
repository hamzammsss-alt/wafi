"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkCenter = void 0;
class WorkCenter {
    constructor(id, companyId, code, name, capacity = 1, // units per day
    costPerHour = 0, isActive = true, createdAt = new Date().toISOString()) {
        this.id = id;
        this.companyId = companyId;
        this.code = code;
        this.name = name;
        this.capacity = capacity;
        this.costPerHour = costPerHour;
        this.isActive = isActive;
        this.createdAt = createdAt;
    }
}
exports.WorkCenter = WorkCenter;
