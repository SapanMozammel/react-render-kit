export type RenderPhase = 'mount' | 'update' | 'unmount';

// Causal trigger — what made this render happen from the runtime's perspective.
// 'state' and 'context' are reserved for future signal sources.
export type RenderTrigger = 'props' | 'state' | 'context' | 'parent' | 'unknown';

// Inferred cause — derived from prop diff analysis, not from React internals.
export type InferredTrigger = 'no-prop-change' | 'genuine-prop-change' | 'reference-instability' | 'mixed';
