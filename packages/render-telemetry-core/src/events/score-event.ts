import type { ScoreEvent, ScoreEventData, TelemetrySession } from '../types/index.js';
import { createEventBase } from './event-base.js';

export const createScoreEvent = (session: TelemetrySession, data: ScoreEventData): { event: ScoreEvent; session: TelemetrySession } => {
	const { base, session: updatedSession } = createEventBase(session, 'score');
	return {
		event: {
			...base,
			renderNumber: data.renderNumber,
			score: data.score,
			grade: data.grade,
			frequencyPenalty: data.frequencyPenalty,
			instabilityPenalty: data.instabilityPenalty,
			memoPenalty: data.memoPenalty,
			mixedSignalPenalty: data.mixedSignalPenalty,
			memoClassification: data.memoClassification,
			signalKind: data.signalKind,
		},
		session: updatedSession,
	};
};
