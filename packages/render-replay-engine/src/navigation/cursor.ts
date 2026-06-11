import type { ReplaySession, ReplayCursor } from '../types/index.js';

export const createCursor = (session: ReplaySession, frameIndex: number): ReplayCursor => {
	const frame = session.frames[frameIndex];
	if (!frame) throw new RangeError(`frameIndex ${frameIndex} out of range`);
	const totalFrames = session.frameCount;
	return {
		sessionId: session.id,
		frameIndex,
		totalFrames,
		isAtStart: frameIndex === 0,
		isAtEnd: frameIndex === totalFrames - 1,
		canGoPrevious: frameIndex > 0,
		canGoNext: frameIndex < totalFrames - 1,
		frame,
	};
};
