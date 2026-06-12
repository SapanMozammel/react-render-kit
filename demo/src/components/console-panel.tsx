'use client';

import type { LogEntry, PropChange } from '@/hooks/use-prop-log';
import { formatValue } from '@/hooks/use-prop-log';

type Props = {
	entries: LogEntry[];
	onClear: () => void;
};

const BADGE_OK = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-ok bg-ok-dim';
const BADGE_WARN = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-warn bg-warn-dim';

const formatTime = (d: Date): string => d.toTimeString().slice(0, 8);

const entryBadge = (entry: LogEntry): { label: string; cls: string } | null => {
	if (entry.changes.length === 0) return null;
	const hasRef = entry.changes.some((c) => c.kind === 'reference-changed');
	return hasRef
		? { label: '⚠ reference', cls: BADGE_WARN }
		: { label: '✓ value change', cls: BADGE_OK };
};

const SectionLine = ({ change }: { change: PropChange }) => {
	const key = <span className="text-muted min-w-[80px] shrink-0">{change.key}</span>;
	switch (change.kind) {
		case 'value-changed':
			return (
				<div className="flex gap-3 py-px pl-2 border-l-2 border-warn">
					{key}
					<span className="text-error">{formatValue(change.prev)}</span>
					<span className="text-dim mx-1">→</span>
					<span className="text-ok">{formatValue(change.next)}</span>
				</div>
			);
		case 'reference-changed':
			return (
				<div className="flex gap-3 py-px pl-2 border-l-2 border-purple">
					{key}
					<span className="text-warn break-all">
						{change.refType === 'function'
							? `[Function] → [Function]`
							: `${formatValue(change.prev)} → ${formatValue(change.next)}`}
					</span>
					<span className="text-[10px] text-dim whitespace-nowrap">same content · new reference</span>
				</div>
			);
		case 'added':
			return (
				<div className="flex gap-3 py-px pl-2 border-l-2 border-ok">
					{key}
					<span className="text-ok">added ({formatValue(change.next)})</span>
				</div>
			);
		case 'removed':
			return (
				<div className="flex gap-3 py-px pl-2 border-l-2 border-error">
					{key}
					<span className="text-error">removed (was {formatValue(change.prev)})</span>
				</div>
			);
	}
};

const EntryView = ({ entry }: { entry: LogEntry }) => {
	if (entry.changes.length === 0) {
		return (
			<div className="py-1.5 border-b border-edge text-dim text-[11px] last:border-b-0">
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
		<div className="border-b border-edge py-2.5 last:border-b-0">
			<div className="flex items-center justify-between mb-2">
				<span className="text-ink font-semibold">
					[why-render] &lt;{entry.componentName}&gt;
				</span>
				<span className="flex items-center gap-2">
					{badge && <span className={badge.cls}>{badge.label}</span>}
					<span className="text-dim text-[11px]">render #{entry.renderNumber}</span>
					<span className="text-dim text-[11px]">{formatTime(entry.at)}</span>
				</span>
			</div>

			{valueChanges.length > 0 && (
				<div className="mb-1.5">
					<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-[3px]">Primitive Changes</div>
					{valueChanges.map((c, i) => <SectionLine key={i} change={c} />)}
				</div>
			)}
			{refChanges.length > 0 && (
				<div className="mb-1.5">
					<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-[3px]">Reference Changes</div>
					{refChanges.map((c, i) => <SectionLine key={i} change={c} />)}
				</div>
			)}
			{added.length > 0 && (
				<div className="mb-1.5">
					<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-[3px]">Added Props</div>
					{added.map((c, i) => <SectionLine key={i} change={c} />)}
				</div>
			)}
			{removed.length > 0 && (
				<div className="mb-1.5">
					<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-[3px]">Removed Props</div>
					{removed.map((c, i) => <SectionLine key={i} change={c} />)}
				</div>
			)}
		</div>
	);
};

const ConsolePanel = ({ entries, onClear }: Props) => (
	<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
		<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
			<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">useWhyRender output</span>
			{entries.length > 0 && (
				<button
					className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors"
					onClick={onClear}
				>
					clear
				</button>
			)}
		</div>
		<div className="p-4 text-xs min-h-[200px]">
			{entries.length === 0 ? (
				<div className="py-6 text-center text-dim text-xs flex flex-col gap-1">
					<span>Trigger an action above.</span>
					<span className="text-[11px] opacity-70">No output = hook stayed silent.</span>
				</div>
			) : (
				entries.map((entry) => <EntryView key={entry.id} entry={entry} />)
			)}
		</div>
	</div>
);

export default ConsolePanel;
