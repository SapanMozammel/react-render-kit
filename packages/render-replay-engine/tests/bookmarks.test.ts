import { describe, it, expect } from 'vitest';
import { createBookmarkStore } from '../src/bookmarks/bookmark-store.js';
import { makeEngine } from './helpers.js';

describe('createBookmarkStore — CRUD', () => {
	it('getAll returns empty initially', () => {
		const store = createBookmarkStore();
		expect(store.getAll()).toHaveLength(0);
	});

	it('create adds a bookmark', () => {
		const store = createBookmarkStore();
		const bm = store.create({ sessionId: 'sess-1', frameIndex: 3, label: 'Interesting' });
		expect(store.getAll()).toHaveLength(1);
		expect(bm.label).toBe('Interesting');
		expect(bm.frameIndex).toBe(3);
	});

	it('create assigns a unique id', () => {
		const store = createBookmarkStore();
		const bm1 = store.create({ sessionId: 'sess-1', frameIndex: 1, label: 'A' });
		const bm2 = store.create({ sessionId: 'sess-1', frameIndex: 2, label: 'B' });
		expect(bm1.id).not.toBe(bm2.id);
	});

	it('create sets note to null when omitted', () => {
		const store = createBookmarkStore();
		const bm = store.create({ sessionId: 'sess-1', frameIndex: 0, label: 'X' });
		expect(bm.note).toBeNull();
	});

	it('create sets note when provided', () => {
		const store = createBookmarkStore();
		const bm = store.create({ sessionId: 'sess-1', frameIndex: 0, label: 'X', note: 'my note' });
		expect(bm.note).toBe('my note');
	});

	it('create sets tags', () => {
		const store = createBookmarkStore();
		const bm = store.create({ sessionId: 'sess-1', frameIndex: 0, label: 'X', tags: ['perf', 'bug'] });
		expect(bm.tags).toEqual(['perf', 'bug']);
	});

	it('remove deletes bookmark by id', () => {
		const store = createBookmarkStore();
		const bm = store.create({ sessionId: 'sess-1', frameIndex: 0, label: 'X' });
		store.remove(bm.id);
		expect(store.getAll()).toHaveLength(0);
	});

	it('update changes label', () => {
		const store = createBookmarkStore();
		const bm = store.create({ sessionId: 'sess-1', frameIndex: 0, label: 'Old' });
		const updated = store.update(bm.id, { label: 'New' });
		expect(updated?.label).toBe('New');
		expect(store.getAll()[0]!.label).toBe('New');
	});

	it('update returns null for unknown id', () => {
		const store = createBookmarkStore();
		expect(store.update('non-existent', { label: 'x' })).toBeNull();
	});
});

describe('createBookmarkStore — queries', () => {
	it('getForSession returns only matching session', () => {
		const store = createBookmarkStore();
		store.create({ sessionId: 'sess-A', frameIndex: 0, label: 'A' });
		store.create({ sessionId: 'sess-B', frameIndex: 0, label: 'B' });
		expect(store.getForSession('sess-A')).toHaveLength(1);
		expect(store.getForSession('sess-A')[0]!.label).toBe('A');
	});

	it('getForFrame returns only matching frame', () => {
		const store = createBookmarkStore();
		store.create({ sessionId: 'sess-1', frameIndex: 2, label: 'Frame 2' });
		store.create({ sessionId: 'sess-1', frameIndex: 5, label: 'Frame 5' });
		expect(store.getForFrame('sess-1', 2)).toHaveLength(1);
		expect(store.getForFrame('sess-1', 5)[0]!.label).toBe('Frame 5');
	});
});

describe('createBookmarkStore — export/import', () => {
	it('exportBookmarks returns all bookmarks', () => {
		const store = createBookmarkStore();
		store.create({ sessionId: 's', frameIndex: 0, label: 'A' });
		store.create({ sessionId: 's', frameIndex: 1, label: 'B' });
		expect(store.exportBookmarks()).toHaveLength(2);
	});

	it('importBookmarks merges without duplicates', () => {
		const store = createBookmarkStore();
		const bm = store.create({ sessionId: 's', frameIndex: 0, label: 'A' });
		store.importBookmarks([bm]);
		expect(store.getAll()).toHaveLength(1); // no duplicate
	});

	it('importBookmarks adds new bookmarks', () => {
		const storeA = createBookmarkStore();
		const bm = storeA.create({ sessionId: 's', frameIndex: 0, label: 'A' });
		const exported = storeA.exportBookmarks();

		const storeB = createBookmarkStore();
		storeB.importBookmarks(exported);
		expect(storeB.getAll()).toHaveLength(1);
		expect(storeB.getAll()[0]!.label).toBe('A');
		void bm;
	});
});

describe('bookmark navigation via engine', () => {
	it('jumpToBookmark returns cursor at bookmarked frame', () => {
		const engine = makeEngine(10);
		const bm = engine.bookmarks.create({
			sessionId: engine.session.id,
			frameIndex: 5,
			label: 'Score drop',
		});
		const cursor = engine.navigate.jumpToBookmark(bm.id);
		expect(cursor?.frameIndex).toBe(5);
	});

	it('jumpToBookmark returns null for unknown id', () => {
		const engine = makeEngine(5);
		expect(engine.navigate.jumpToBookmark('unknown-id')).toBeNull();
	});
});
