import type { IntelligenceErrorCode } from '../types/index.js';

export class IntelligenceError extends Error {
	readonly code: IntelligenceErrorCode;

	constructor(code: IntelligenceErrorCode, message: string) {
		super(message);
		this.name = 'IntelligenceError';
		this.code = code;
	}
}

export const createIntelligenceError = (code: IntelligenceErrorCode, message: string): IntelligenceError =>
	new IntelligenceError(code, message);
