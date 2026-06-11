import type { ReplaySessionId } from './replay-ids.js';
import type { ReplayFrame } from './replay-frame.js';
import type { HealthGrade } from '../analysis/scoring.js';
import type { SignalKind } from '../analysis/memo.js';
import type { SchemaVersion } from '../version/schema-version.js';

export type ReplaySessionStats = {
	readonly totalRenders: number;
	readonly averageScore: number | null;
	readonly minScore: number | null;
	readonly maxScore: number | null;
	readonly initialScore: number | null;
	readonly finalScore: number | null;
	readonly scoreDelta: number | null;
	readonly ineffectiveRenderCount: number;
	readonly highFrequencyCount: number;
	readonly unstablePropNames: readonly string[];
	readonly totalRecommendations: number;
	readonly uniqueRecommendations: readonly string[];
};

export type ReplayPruningInfo =
	| {
			readonly pruned: true;
			readonly originalFrameCount: number;
			readonly prunedFrameCount: number;
			readonly strategy: 'fifo' | 'score-weighted';
	  }
	| {
			readonly pruned: false;
	  };

export type ReplayTimelineEntry = {
	readonly frameIndex: number;
	readonly renderNumber: number;
	readonly wallTimestamp: number;
	readonly relativeMs: number;
	readonly score: number | null;
	readonly grade: HealthGrade | null;
	readonly severity: 'ok' | 'warn' | 'critical';
	readonly hasUnstableProps: boolean;
	readonly signalKind: SignalKind | null;
};

export type ReplaySegment = {
	readonly label: string;
	readonly startFrameIndex: number;
	readonly endFrameIndex: number;
	readonly trend: 'improving' | 'degrading' | 'stable' | 'volatile';
	readonly avgScore: number | null;
};

export type ReplayTimeline = {
	readonly sessionId: ReplaySessionId;
	readonly entries: readonly ReplayTimelineEntry[];
	readonly duration: number | null;
	readonly segments: readonly ReplaySegment[];
};

export type ReplaySession = {
	readonly id: ReplaySessionId;
	readonly componentName: string;
	readonly startedAt: number;
	readonly endedAt: number | null;
	readonly durationMs: number | null;
	readonly schemaVersion: SchemaVersion;

	readonly frames: readonly ReplayFrame[];
	readonly frameCount: number;

	readonly timeline: ReplayTimeline;
	readonly stats: ReplaySessionStats;
	readonly pruningInfo: ReplayPruningInfo;
};
