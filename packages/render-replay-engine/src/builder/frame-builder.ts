import type { TelemetryEvent, RenderEvent, PropChangeEvent, FrequencyEvent, ScoreEvent, RecommendationEvent, TelemetryRenderTrigger } from '@sapanmozammel/render-telemetry-core';
import type { ReplayFrame, ReplaySessionId } from '../types/index.js';

const mapTriggeredBy = (trigger: TelemetryRenderTrigger): 'parent' | 'props' => {
	if (trigger === 'props' || trigger === 'state' || trigger === 'context') return 'props';
	return 'parent';
};

type PartialFrame = {
	frameIndex: number;
	renderNumber: number;
	wallTimestamp: number;
	renderEvent: RenderEvent;
	propChangeEvent: PropChangeEvent | null;
	frequencyEvent: FrequencyEvent | null;
	scoreEvent: ScoreEvent | null;
	recommendationEvent: RecommendationEvent | null;
};

// events must be pre-sorted by sequenceNumber; all same sessionId
export const buildFrames = (events: readonly TelemetryEvent[], startedAt: number, sessionId: ReplaySessionId): readonly ReplayFrame[] => {
	const frameMap = new Map<number, PartialFrame>();
	let nextFrameIndex = 0;

	for (const event of events) {
		if (event.type === 'render') {
			if (!frameMap.has(event.renderNumber)) {
				frameMap.set(event.renderNumber, {
					frameIndex: nextFrameIndex++,
					renderNumber: event.renderNumber,
					wallTimestamp: event.wallTimestamp,
					renderEvent: event,
					propChangeEvent: null,
					frequencyEvent: null,
					scoreEvent: null,
					recommendationEvent: null,
				});
			}
		} else if (event.type === 'prop-change') {
			const frame = frameMap.get(event.renderNumber);
			if (frame && frame.propChangeEvent === null) frame.propChangeEvent = event;
		} else if (event.type === 'frequency') {
			const frame = frameMap.get(event.renderNumber);
			if (frame && frame.frequencyEvent === null) frame.frequencyEvent = event;
		} else if (event.type === 'score') {
			const frame = frameMap.get(event.renderNumber);
			if (frame && frame.scoreEvent === null) frame.scoreEvent = event;
		} else if (event.type === 'recommendation') {
			const frame = frameMap.get(event.renderNumber);
			if (frame && frame.recommendationEvent === null) frame.recommendationEvent = event;
		}
	}

	const frames: ReplayFrame[] = Array.from(frameMap.values())
		.sort((a, b) => a.frameIndex - b.frameIndex)
		.map((partial): ReplayFrame => {
			const { propChangeEvent, frequencyEvent, scoreEvent, recommendationEvent } = partial;
			return Object.freeze<ReplayFrame>({
				id: `${sessionId}:${partial.frameIndex}`,
				frameIndex: partial.frameIndex,
				renderNumber: partial.renderNumber,
				sessionId,
				componentName: partial.renderEvent.componentName,
				wallTimestamp: partial.wallTimestamp,
				relativeMs: partial.wallTimestamp - startedAt,
				renderEvent: partial.renderEvent,
				propChangeEvent,
				frequencyEvent,
				scoreEvent,
				recommendationEvent,
				score: scoreEvent !== null ? scoreEvent.score : null,
				grade: scoreEvent !== null ? scoreEvent.grade : null,
				memoClassification: scoreEvent !== null ? scoreEvent.memoClassification : null,
				frequencyClass: frequencyEvent !== null ? frequencyEvent.classification : null,
				signalKind: propChangeEvent !== null ? propChangeEvent.signalKind : null,
				hasUnstableProps: propChangeEvent !== null && propChangeEvent.unstable.length > 0,
				unstablePropCount: propChangeEvent !== null ? propChangeEvent.unstable.length : 0,
				changedPropCount: propChangeEvent !== null ? propChangeEvent.changed.length : 0,
				recommendationCount: recommendationEvent !== null ? recommendationEvent.recommendations.length : 0,
				triggeredBy: mapTriggeredBy(partial.renderEvent.triggeredBy),
			});
		});

	return Object.freeze(frames);
};
