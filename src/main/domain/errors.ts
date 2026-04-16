export class DomainError extends Error {
    constructor(public code: string, message: string, public details?: any) {
        super(message);
        this.name = 'DomainError';
    }
}
