import type { ReplaySerializedSource } from '../types/index.js';

export const fromSerialized = (json: string): ReplaySerializedSource => ({
	type: 'serialized',
	json,
});
