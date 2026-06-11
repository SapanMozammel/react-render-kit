import type { ReplayErrorCode } from '../types/index.js';

export class ReplayError extends Error {
	readonly code: ReplayErrorCode;
	readonly detail: string | undefined;

	constructor(code: ReplayErrorCode, detail?: string) {
		super(detail ? `[render-replay-engine] ${code}: ${detail}` : `[render-replay-engine] ${code}`);
		this.name = 'ReplayError';
		this.code = code;
		this.detail = detail;
	}
}

export const createReplayError = (code: ReplayErrorCode, detail?: string): ReplayError => new ReplayError(code, detail);
