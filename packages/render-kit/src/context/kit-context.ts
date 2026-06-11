import React from 'react';
import { RenderKitError } from '../errors/kit-error.js';
import type { RenderKit, RenderKitProviderProps } from '../types/index.js';

const RenderKitContext = React.createContext<RenderKit | null>(null);

export const RenderKitProvider = ({ kit, children }: RenderKitProviderProps): React.ReactElement => React.createElement(RenderKitContext.Provider, { value: kit }, children);

export const useRenderKit = (): RenderKit => {
	const kit = React.useContext(RenderKitContext);
	if (kit === null) {
		throw new RenderKitError('CONTEXT_MISSING', 'useRenderKit() must be called inside <RenderKitProvider>');
	}
	return kit;
};
