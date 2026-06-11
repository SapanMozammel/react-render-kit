import type {
	ReplayBookmark,
	ReplayBookmarkId,
	ReplayBookmarkCreateParams,
	ReplayBookmarkUpdate,
	ReplayBookmarkStore,
	ReplaySessionId,
} from '../types/index.js';

const generateId = (): string => {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
};

export const createBookmarkStore = (): ReplayBookmarkStore => {
	let bookmarks: ReplayBookmark[] = [];

	const getAll = (): readonly ReplayBookmark[] => bookmarks;

	const getForSession = (sessionId: ReplaySessionId): readonly ReplayBookmark[] =>
		bookmarks.filter((b) => b.sessionId === sessionId);

	const getForFrame = (sessionId: ReplaySessionId, frameIndex: number): readonly ReplayBookmark[] =>
		bookmarks.filter((b) => b.sessionId === sessionId && b.frameIndex === frameIndex);

	const create = (params: ReplayBookmarkCreateParams): ReplayBookmark => {
		const bookmark: ReplayBookmark = Object.freeze({
			id: generateId(),
			sessionId: params.sessionId,
			frameIndex: params.frameIndex,
			label: params.label,
			note: params.note ?? null,
			createdAt: Date.now(),
			tags: Object.freeze(params.tags ? [...params.tags] : []),
		});
		bookmarks = [...bookmarks, bookmark];
		return bookmark;
	};

	const remove = (bookmarkId: ReplayBookmarkId): void => {
		bookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
	};

	const update = (bookmarkId: ReplayBookmarkId, updates: ReplayBookmarkUpdate): ReplayBookmark | null => {
		const idx = bookmarks.findIndex((b) => b.id === bookmarkId);
		if (idx === -1) return null;
		const existing = bookmarks[idx]!;
		const updated: ReplayBookmark = Object.freeze({
			...existing,
			label: updates.label !== undefined ? updates.label : existing.label,
			note: updates.note !== undefined ? updates.note : existing.note,
			tags: updates.tags !== undefined ? Object.freeze([...updates.tags]) : existing.tags,
		});
		bookmarks = [...bookmarks.slice(0, idx), updated, ...bookmarks.slice(idx + 1)];
		return updated;
	};

	const exportBookmarks = (): readonly ReplayBookmark[] => [...bookmarks];

	const importBookmarks = (incoming: readonly ReplayBookmark[]): void => {
		const existingIds = new Set(bookmarks.map((b) => b.id));
		const newOnes = incoming.filter((b) => !existingIds.has(b.id));
		bookmarks = [...bookmarks, ...newOnes];
	};

	return { getAll, getForSession, getForFrame, create, remove, update, exportBookmarks, importBookmarks };
};
