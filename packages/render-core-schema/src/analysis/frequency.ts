export type FrequencyClass = 'LOW' | 'MODERATE' | 'HIGH' | 'NOT_ENOUGH_DATA';

export type FrequencyMeasurement = {
	readonly windowMs: number;
	readonly windowCount: number;
	readonly rate: number;
	readonly classification: FrequencyClass;
	readonly totalRenders: number;
};
