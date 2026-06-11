import type { ReplaySessionId } from './replay-ids.js';
import type { ReplayFrame } from './replay-frame.js';

export type ReplayCursor = {
	readonly sessionId: ReplaySessionId;
	readonly frameIndex: number;
	readonly totalFrames: number;
	readonly isAtStart: boolean;
	readonly isAtEnd: boolean;
	readonly canGoPrevious: boolean;
	readonly canGoNext: boolean;
	readonly frame: ReplayFrame;
};
