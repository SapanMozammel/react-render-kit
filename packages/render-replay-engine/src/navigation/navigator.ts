import type { ReplaySession, ReplayCursor, ReplayFilter, ReplayBookmarkStore, ReplayNavigator, ReplayBookmarkId } from '../types/index.js';
import { createCursor } from './cursor.js';
import { frameMatchesFilter } from '../filter/filter.js';

type TimestampEntry = { relativeMs: number; frameIndex: number };

const buildRenderNumberIndex = (session: ReplaySession): ReadonlyMap<number, number> => {
	const map = new Map<number, number>();
	for (const frame of session.frames) {
		map.set(frame.renderNumber, frame.frameIndex);
	}
	return map;
};

const buildTimestampIndex = (session: ReplaySession): readonly TimestampEntry[] => {
	return Object.freeze(
		[...session.frames]
			.sort((a, b) => a.relativeMs - b.relativeMs)
			.map((f) => ({ relativeMs: f.relativeMs, frameIndex: f.frameIndex }))
	);
};

// binary search: find frame index whose relativeMs is closest to target
const binarySearchNearest = (index: readonly TimestampEntry[], targetMs: number): number => {
	let lo = 0;
	let hi = index.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (index[mid]!.relativeMs < targetMs) lo = mid + 1;
		else hi = mid;
	}
	// check lo-1 in case it's closer
	if (lo > 0) {
		const prev = index[lo - 1]!;
		const curr = index[lo]!;
		if (Math.abs(prev.relativeMs - targetMs) < Math.abs(curr.relativeMs - targetMs)) {
			return prev.frameIndex;
		}
	}
	return index[lo]?.frameIndex ?? 0;
};

export const createNavigator = (session: ReplaySession, bookmarkStore: ReplayBookmarkStore): ReplayNavigator => {
	const renderNumberIndex = buildRenderNumberIndex(session);
	const timestampIndex = buildTimestampIndex(session);

	const at = (frameIndex: number): ReplayCursor | null => {
		if (frameIndex < 0 || frameIndex >= session.frameCount) return null;
		return createCursor(session, frameIndex);
	};

	return {
		atStart: () => createCursor(session, 0),
		atEnd: () => createCursor(session, session.frameCount - 1),
		at,
		next: (cursor) => at(cursor.frameIndex + 1),
		previous: (cursor) => at(cursor.frameIndex - 1),
		seek: (cursor, frameIndex) => {
			void cursor;
			return at(frameIndex);
		},
		jumpToRender: (cursor, renderNumber) => {
			void cursor;
			const idx = renderNumberIndex.get(renderNumber);
			return idx !== undefined ? at(idx) : null;
		},
		jumpToTimestamp: (_cursor, relativeMs) => {
			if (session.frameCount === 0) {
				// should never happen — engine throws NO_RENDER_EVENTS before this
				return createCursor(session, 0);
			}
			const frameIndex = binarySearchNearest(timestampIndex, relativeMs);
			return createCursor(session, frameIndex);
		},
		nextMatching: (cursor, filter) => {
			let idx = cursor.frameIndex + 1;
			while (idx < session.frameCount) {
				const frame = session.frames[idx];
				if (frame && frameMatchesFilter(frame, filter)) return createCursor(session, idx);
				idx++;
			}
			return null;
		},
		previousMatching: (cursor, filter) => {
			let idx = cursor.frameIndex - 1;
			while (idx >= 0) {
				const frame = session.frames[idx];
				if (frame && frameMatchesFilter(frame, filter)) return createCursor(session, idx);
				idx--;
			}
			return null;
		},
		jumpToBookmark: (bookmarkId: ReplayBookmarkId) => {
			const all = bookmarkStore.getAll();
			const bm = all.find((b) => b.id === bookmarkId);
			if (!bm) return null;
			return at(bm.frameIndex);
		},
	};
};
