import type { RecommendationEvent, RecommendationEventData, TelemetrySession } from '../types/index.js';
import { createEventBase } from './event-base.js';

export const createRecommendationEvent = (session: TelemetrySession, data: RecommendationEventData): { event: RecommendationEvent; session: TelemetrySession } => {
	const { base, session: updatedSession } = createEventBase(session, 'recommendation');
	return {
		event: {
			...base,
			renderNumber: data.renderNumber,
			recommendations: data.recommendations,
		},
		session: updatedSession,
	};
};
