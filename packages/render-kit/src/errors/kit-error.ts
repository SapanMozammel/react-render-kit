import type { RenderKitErrorCode } from '../types/index.js';

export class RenderKitError extends Error {
	readonly code: RenderKitErrorCode;

	constructor(code: RenderKitErrorCode, message: string) {
		super(message);
		this.name = 'RenderKitError';
		this.code = code;
		const ErrorWithCapture = Error as typeof Error & {
			captureStackTrace?: (target: object, fn: unknown) => void;
		};
		if (ErrorWithCapture.captureStackTrace) {
			ErrorWithCapture.captureStackTrace(this, RenderKitError);
		}
	}
}

export const createRenderKitError = (code: RenderKitErrorCode, message: string): RenderKitError =>
	new RenderKitError(code, message);
