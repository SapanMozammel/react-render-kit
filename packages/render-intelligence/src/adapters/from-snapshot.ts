import type { TelemetrySnapshot } from '@sapanmozammel/render-core-schema';
import type { ComponentSessionData } from '../types/index.js';
import { fromEvents } from './from-events.js';

export const fromSnapshot = (snapshot: TelemetrySnapshot): readonly ComponentSessionData[] => fromEvents(snapshot.events);
