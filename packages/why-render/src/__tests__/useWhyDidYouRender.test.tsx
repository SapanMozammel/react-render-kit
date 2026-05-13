import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWhyDidYouRender } from '../useWhyDidYouRender';
import type { WhyDidYouRenderOptions } from '../types';

function Probe(props: Record<string, unknown>) {
	useWhyDidYouRender('Probe', props);
	return null;
}

function ProbeWithOptions({
	options,
	...rest
}: Record<string, unknown> & { options?: WhyDidYouRenderOptions }) {
	useWhyDidYouRender('Probe', rest, options);
	return null;
}

describe('useWhyDidYouRender', () => {
	let groupSpy: ReturnType<typeof vi.spyOn>;
	let logSpy: ReturnType<typeof vi.spyOn>;
	let groupEndSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not log on first render', () => {
		render(<Probe value={1} />);
		expect(groupSpy).not.toHaveBeenCalled();
		expect(logSpy).not.toHaveBeenCalled();
	});

	it('logs once when a primitive prop changes', () => {
		const { rerender } = render(<Probe value={1} />);
		rerender(<Probe value={2} />);
		expect(groupSpy).toHaveBeenCalledWith('[Probe] re-rendered because:');
		expect(logSpy).toHaveBeenCalledWith('- prop "value" changed: 1 → 2');
		expect(groupEndSpy).toHaveBeenCalled();
	});

	it('detects reference changes for objects', () => {
		const { rerender } = render(<Probe user={{ id: 1 }} />);
		rerender(<Probe user={{ id: 1 }} />);
		expect(logSpy).toHaveBeenCalledWith('- prop "user" reference changed');
	});

	it('does not log when no props changed', () => {
		const user = { id: 1 };
		const { rerender } = render(<Probe user={user} />);
		rerender(<Probe user={user} />);
		expect(groupSpy).not.toHaveBeenCalled();
	});

	it('honors a custom equality function', () => {
		const deepEqualByJson = (a: unknown, b: unknown) =>
			JSON.stringify(a) === JSON.stringify(b);
		const options = { isEqual: deepEqualByJson };
		const { rerender } = render(
			<ProbeWithOptions options={options} user={{ id: 1 }} />,
		);
		rerender(<ProbeWithOptions options={options} user={{ id: 1 }} />);
		expect(groupSpy).not.toHaveBeenCalled();
	});

	it('detects added and removed props across renders', () => {
		const { rerender } = render(<Probe a={1} />);
		rerender(<Probe b={2} />);
		expect(logSpy).toHaveBeenCalledWith('- prop "a" removed (was 1)');
		expect(logSpy).toHaveBeenCalledWith('- prop "b" added: 2');
	});
});
