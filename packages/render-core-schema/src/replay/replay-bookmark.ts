import type { ReplaySessionId, ReplayFrameId, ReplayBookmarkId } from './replay-ids.js';

export type ReplayBookmark = {
	readonly id: ReplayBookmarkId;
	readonly sessionId: ReplaySessionId;
	readonly frameIndex: number;
	readonly frameId: ReplayFrameId;
	readonly label: string;
	readonly note: string | null;
	readonly createdAt: number;
	readonly tags: readonly string[];
};

export type ReplayBookmarkCreateParams = {
	readonly sessionId: ReplaySessionId;
	readonly frameIndex: number;
	readonly label: string;
	readonly note?: string;
	readonly tags?: readonly string[];
};

export type ReplayBookmarkUpdate = {
	readonly label?: string;
	readonly note?: string | null;
	readonly tags?: readonly string[];
};

export type ReplayBookmarkStore = {
	readonly getAll: () => readonly ReplayBookmark[];
	readonly getForSession: (sessionId: ReplaySessionId) => readonly ReplayBookmark[];
	readonly getForFrame: (sessionId: ReplaySessionId, frameIndex: number) => readonly ReplayBookmark[];
	readonly create: (params: ReplayBookmarkCreateParams) => ReplayBookmark;
	readonly remove: (bookmarkId: ReplayBookmarkId) => void;
	readonly update: (bookmarkId: ReplayBookmarkId, updates: ReplayBookmarkUpdate) => ReplayBookmark | null;
	readonly exportBookmarks: () => readonly ReplayBookmark[];
	readonly importBookmarks: (bookmarks: readonly ReplayBookmark[]) => void;
};
