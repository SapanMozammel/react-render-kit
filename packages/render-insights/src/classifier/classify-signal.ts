import type { PropChangeSummary, RenderSignal, SignalKind } from '../types/index.js';

export const classifySignal = (summary: PropChangeSummary): RenderSignal | null => {
	if (summary.changed.length === 0) return null;

	let hasGenuine = false;
	let hasReference = false;

	for (const entry of summary.changed) {
		if (entry.kind === 'reference-changed') {
			hasReference = true;
		} else {
			hasGenuine = true;
		}
	}

	const kind: SignalKind = hasGenuine && hasReference ? 'mixed' : hasGenuine ? 'genuine' : 'reference-only';

	const genuineKeys = summary.changed
		.filter((e) => e.kind !== 'reference-changed')
		.map((e) => e.key);

	return { kind, genuineKeys, unstableProps: summary.unstable };
};
