'use client';

import type { LogEntry, PropChange } from '@/hooks/use-prop-log';
import { formatValue } from '@/hooks/use-prop-log';

type Props = {
	entries: LogEntry[];
	onClear: () => void;
};

const formatTime = (d: Date): string => d.toTimeString().slice(0, 8);

const entryBadge = (entry: LogEntry): { label: string; cls: string } | null => {
	if (entry.changes.length === 0) return null;
	const hasRef = entry.changes.some((c) => c.kind === 'reference-changed');
	return hasRef
		? { label: '⚠ reference', cls: 'console-entry__badge--warn' }
		: { label: '✓ value change', cls: 'console-entry__badge--ok' };
};

const SectionLine = ({ change }: { change: PropChange }) => {
	switch (change.kind) {
		case 'value-changed':
			return (
				<div className="console-section__line console-section__line--value">
					<span className="console-line__key">{change.key}</span>
					<span className="console-line__value--prev">{formatValue(change.prev)}</span>
					<span className="console-line__arrow">→</span>
					<span className="console-line__value--next">{formatValue(change.next)}</span>
				</div>
			);
		case 'reference-changed':
			return (
				<div className="console-section__line console-section__line--reference">
					<span className="console-line__key">{change.key}</span>
					<span className="console-line__ref-values">
						{change.refType === 'function'
							? `[Function] → [Function]`
							: `${formatValue(change.prev)} → ${formatValue(change.next)}`}
					</span>
					<span className="console-line__ref-hint">same content · new reference</span>
				</div>
			);
		case 'added':
			return (
				<div className="console-section__line console-section__line--added">
					<span className="console-line__key">{change.key}</span>
					<span className="console-line__added">added ({formatValue(change.next)})</span>
				</div>
			);
		case 'removed':
			return (
				<div className="console-section__line console-section__line--removed">
					<span className="console-line__key">{change.key}</span>
					<span className="console-line__removed">removed (was {formatValue(change.prev)})</span>
				</div>
			);
	}
};

const EntryView = ({ entry }: { entry: LogEntry }) => {
	if (entry.changes.length === 0) {
		return (
			<div className="console-entry console-entry--silent">
				✓ render #{entry.renderNumber} — no changes
			</div>
		);
	}

	const badge = entryBadge(entry);
	const valueChanges = entry.changes.filter((c) => c.kind === 'value-changed');
	const refChanges = entry.changes.filter((c) => c.kind === 'reference-changed');
	const added = entry.changes.filter((c) => c.kind === 'added');
	const removed = entry.changes.filter((c) => c.kind === 'removed');

	return (
		<div className="console-entry">
			<div className="console-entry__header">
				<span className="console-entry__title">
					[why-render] &lt;{entry.componentName}&gt;
				</span>
				<span className="console-entry__meta">
					{badge && (
						<span className={`console-entry__badge ${badge.cls}`}>{badge.label}</span>
					)}
					<span className="console-entry__render">render #{entry.renderNumber}</span>
					<span className="console-entry__time">{formatTime(entry.at)}</span>
				</span>
			</div>

			{valueChanges.length > 0 && (
				<div className="console-section">
					<div className="console-section__label">Primitive Changes</div>
					{valueChanges.map((c, i) => (
						<SectionLine key={i} change={c} />
					))}
				</div>
			)}
			{refChanges.length > 0 && (
				<div className="console-section">
					<div className="console-section__label">Reference Changes</div>
					{refChanges.map((c, i) => (
						<SectionLine key={i} change={c} />
					))}
				</div>
			)}
			{added.length > 0 && (
				<div className="console-section">
					<div className="console-section__label">Added Props</div>
					{added.map((c, i) => (
						<SectionLine key={i} change={c} />
					))}
				</div>
			)}
			{removed.length > 0 && (
				<div className="console-section">
					<div className="console-section__label">Removed Props</div>
					{removed.map((c, i) => (
						<SectionLine key={i} change={c} />
					))}
				</div>
			)}
		</div>
	);
};

const ConsolePanel = ({ entries, onClear }: Props) => (
	<div className="demo-pane">
		<div className="demo-pane__header">
			<span className="demo-pane__title">useWhyRender output</span>
			{entries.length > 0 && (
				<button className="btn btn--ghost btn--sm" onClick={onClear}>
					clear
				</button>
			)}
		</div>
		<div className="demo-pane__body console-panel">
			{entries.length === 0 ? (
				<div className="console-panel__empty">
					<span>Trigger an action above.</span>
					<span className="console-panel__empty-hint">No output = hook stayed silent.</span>
				</div>
			) : (
				entries.map((entry) => <EntryView key={entry.id} entry={entry} />)
			)}
		</div>
	</div>
);

export default ConsolePanel;
