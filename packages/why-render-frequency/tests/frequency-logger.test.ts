import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logFrequency } from '../src/logger/frequency-logger';

describe('logFrequency', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls groupCollapsed with correct header', () => {
		logFrequency('UserCard', 10, 7, 10000);
		expect(console.groupCollapsed).toHaveBeenCalledWith('[why-render-frequency] <UserCard>');
	});

	it('calls groupEnd', () => {
		logFrequency('UserCard', 10, 7, 10000);
		expect(console.groupEnd).toHaveBeenCalled();
	});

	it('logs total count', () => {
		logFrequency('UserCard', 42, 7, 10000);
		expect(console.log).toHaveBeenCalledWith('  42');
	});

	it('logs window count', () => {
		logFrequency('UserCard', 42, 7, 10000);
		expect(console.log).toHaveBeenCalledWith('  7 renders');
	});

	it('logs window duration label for 10s', () => {
		logFrequency('UserCard', 42, 7, 10000);
		expect(console.log).toHaveBeenCalledWith('Window (last 10s)');
	});

	it('logs window duration label for 5s', () => {
		logFrequency('UserCard', 5, 3, 5000);
		expect(console.log).toHaveBeenCalledWith('Window (last 5s)');
	});

	it('logs window duration label for 60s', () => {
		logFrequency('UserCard', 60, 30, 60000);
		expect(console.log).toHaveBeenCalledWith('Window (last 60s)');
	});

	it('logs rate formatted to 1 decimal place', () => {
		// rate = 7 / (10000/1000) = 7/10 = 0.7
		logFrequency('UserCard', 42, 7, 10000);
		expect(console.log).toHaveBeenCalledWith('  0.7 renders/sec');
	});

	it('logs rate as 12.0 when rate is a whole number', () => {
		// rate = 12 / (1000/1000) = 12/1 = 12.0
		logFrequency('UserCard', 12, 12, 1000);
		expect(console.log).toHaveBeenCalledWith('  12.0 renders/sec');
	});

	it('observation: low when rate <= 2', () => {
		// rate = 7/10 = 0.7 <= 2
		logFrequency('UserCard', 42, 7, 10000);
		expect(console.log).toHaveBeenCalledWith('  Low render activity');
	});

	it('observation: low at exactly rate 2', () => {
		// rate = 2 / (1000/1000) = 2 <= 2
		logFrequency('UserCard', 2, 2, 1000);
		expect(console.log).toHaveBeenCalledWith('  Low render activity');
	});

	it('observation: moderate when rate > 2', () => {
		// rate = 3 / (1000/1000) = 3 > 2
		logFrequency('UserCard', 3, 3, 1000);
		expect(console.log).toHaveBeenCalledWith('  Moderate render activity');
	});

	it('observation: high when rate > 10', () => {
		// rate = 11 / (1000/1000) = 11 > 10
		logFrequency('UserCard', 11, 11, 1000);
		expect(console.log).toHaveBeenCalledWith('  High render frequency detected');
	});

	it('observation: moderate at exactly rate 10', () => {
		// rate = 10 / (1000/1000) = 10, not > 10
		logFrequency('UserCard', 10, 10, 1000);
		expect(console.log).toHaveBeenCalledWith('  Moderate render activity');
	});
});
