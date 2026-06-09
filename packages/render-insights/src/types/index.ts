// ── Frequency ──────────────────────────────────────────────────────────────

export type FrequencyClass = 'LOW' | 'MODERATE' | 'HIGH' | 'NOT_ENOUGH_DATA';

export type FrequencySummary = {
	totalRenders: number;
	windowCount: number;
	windowMs: number;
	rate: number;
	classification: FrequencyClass;
};

// ── Props ──────────────────────────────────────────────────────────────────

export type PropChangeKind = 'value-changed' | 'reference-changed' | 'added' | 'removed';

export type PropChangeEntry =
	| { kind: 'value-changed'; key: string; prev: unknown; next: unknown }
	| { kind: 'reference-changed'; key: string; refType: 'function' | 'array' | 'object' }
	| { kind: 'added'; key: string; next: unknown }
	| { kind: 'removed'; key: string; prev: unknown };

export type PropInstabilityKind = 'function' | 'array' | 'object';

export type PropInstability = {
	name: string;
	type: PropInstabilityKind;
};

export type PropChangeSummary = {
	changed: PropChangeEntry[];
	unstable: PropInstability[];
};

// ── Signals ────────────────────────────────────────────────────────────────

export type SignalKind = 'genuine' | 'reference-only' | 'mixed';

export type RenderSignal = {
	kind: SignalKind;
	genuineKeys: string[];
	unstableProps: PropInstability[];
};

// ── Memo Session ──────────────────────────────────────────────────────────

export type MemoClassification = 'NOT_APPLICABLE' | 'EFFECTIVE' | 'INEFFECTIVE' | 'PARTIALLY_EFFECTIVE';

export type MemoSummary = {
	signalKind: SignalKind | null;
	sessionClass: MemoClassification;
	genuineCount: number;
	referenceOnlyCount: number;
	mixedCount: number;
};

// ── Scoring ───────────────────────────────────────────────────────────────

export type HealthGrade = 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL';

// ── Trigger Inference ─────────────────────────────────────────────────────

export type InferredTrigger = 'no-prop-change' | 'genuine-prop-change' | 'reference-instability' | 'mixed';

// ── Report ────────────────────────────────────────────────────────────────

export type InsightReport = {
	componentName: string;
	renderNumber: number;
	reportNumber: number;
	props: PropChangeSummary;
	frequency: FrequencySummary;
	memo: MemoSummary;
	score: number;
	grade: HealthGrade;
	inferredTrigger: InferredTrigger;
	recommendations: string[];
};

// ── Options ───────────────────────────────────────────────────────────────

export type RenderInsightsOptions = {
	enabled?: boolean;
	ignoreProps?: string[];
	maxReports?: number;
	logOnEveryRender?: boolean;
	frequencyWindowMs?: number;
	frequencyLogEvery?: number;
	onReport?: (report: InsightReport) => void;
};
