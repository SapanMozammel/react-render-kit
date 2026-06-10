import React from 'react';
import { createPlaygroundStore } from '../store/playground-store.js';
import type { PlaygroundProviderProps, PlaygroundStore } from '../types/index.js';

export const PlaygroundContext = React.createContext<PlaygroundStore | null>(null);

export const usePlaygroundStore = (): PlaygroundStore => {
	const store = React.useContext(PlaygroundContext);
	if (process.env.NODE_ENV === 'development' && store === null) {
		throw new Error('[render-playground] useRenderPlayground must be used inside <PlaygroundProvider>');
	}
	return store as PlaygroundStore;
};

export const PlaygroundProvider = ({ children, maxEntries, store }: PlaygroundProviderProps): React.ReactElement => {
	const storeRef = React.useRef<PlaygroundStore | null>(null);
	if (storeRef.current === null) {
		storeRef.current = store ?? createPlaygroundStore(maxEntries);
	}

	if (process.env.NODE_ENV !== 'development') {
		return React.createElement(React.Fragment, null, children);
	}

	return React.createElement(PlaygroundContext.Provider, { value: storeRef.current }, children);
};
