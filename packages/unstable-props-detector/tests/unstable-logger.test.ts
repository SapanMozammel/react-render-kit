/* eslint-disable no-console */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logInstability, logStable } from '../src/logger/unstable-logger';
import type { PropInstability } from '../src/types';

const unstable: PropInstability[] = [
	{ name: 'onClick', type: 'function' },
	{ name: 'config', type: 'object' },
	{ name: 'ids', type: 'array' },
];

describe('logInstability', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls groupCollapsed with the correct header format', () => {
		logInstability('UserList', unstable, 1, 10, false);
		expect(console.groupCollapsed).toHaveBeenCalledWith('[unstable-props-detector] <UserList>');
	});

	it('calls groupEnd to close the group', () => {
		logInstability('UserList', unstable, 1, 10, false);
		expect(console.groupEnd).toHaveBeenCalled();
	});

	it('includes prop type in log output', () => {
		logInstability('UserList', [{ name: 'fn', type: 'function' }], 1, 10, false);
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(calls).toContain('function');
	});

	it('includes prop name in log output', () => {
		logInstability('UserList', [{ name: 'onClick', type: 'function' }], 1, 10, false);
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(calls).toContain('onClick');
	});

	it('includes report counter in log output', () => {
		logInstability('UserList', unstable, 4, 10, false);
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(calls).toContain('[report 4 / 10]');
	});

	it('includes suppression notice on the last report', () => {
		logInstability('UserList', unstable, 10, 10, true);
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(calls).toContain('further reports suppressed');
	});

	it('does not include suppression notice on non-final reports', () => {
		logInstability('UserList', unstable, 3, 10, false);
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(calls).not.toContain('further reports suppressed');
	});

	it('logs all three prop types when present', () => {
		logInstability('UserList', unstable, 1, 10, false);
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(calls).toContain('function');
		expect(calls).toContain('object');
		expect(calls).toContain('array');
	});
});

describe('logStable', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('uses console.log, not console.groupCollapsed', () => {
		logStable('UserList');
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).toHaveBeenCalled();
	});

	it('includes the component name in the stable output', () => {
		logStable('UserList');
		const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.join('') ?? '';
		expect(call).toContain('UserList');
	});

	it('includes "stable" in the output', () => {
		logStable('UserList');
		const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.join('') ?? '';
		expect(call).toContain('stable');
	});
});
