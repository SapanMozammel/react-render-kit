import type { ReplayCursor } from './replay-cursor.js';
import type { ReplayFilter } from './replay-filter.js';
import type { ReplayBookmarkId } from './replay-ids.js';

export type ReplayNavigator = {
	atStart: () => ReplayCursor;
	atEnd: () => ReplayCursor;
	at: (frameIndex: number) => ReplayCursor | null;
	next: (cursor: ReplayCursor) => ReplayCursor | null;
	previous: (cursor: ReplayCursor) => ReplayCursor | null;
	seek: (cursor: ReplayCursor, frameIndex: number) => ReplayCursor | null;
	jumpToRender: (cursor: ReplayCursor, renderNumber: number) => ReplayCursor | null;
	jumpToTimestamp: (cursor: ReplayCursor, relativeMs: number) => ReplayCursor;
	nextMatching: (cursor: ReplayCursor, filter: ReplayFilter) => ReplayCursor | null;
	previousMatching: (cursor: ReplayCursor, filter: ReplayFilter) => ReplayCursor | null;
	jumpToBookmark: (bookmarkId: ReplayBookmarkId) => ReplayCursor | null;
};
