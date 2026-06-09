export type ScenarioId =
	| 'perfectly-optimized'
	| 'inline-callback-hell'
	| 'inline-object-instability'
	| 'memo-defeated'
	| 'partial-memo'
	| 'high-frequency'
	| 'deep-cascade';

export type ScenarioBadge = 'warn' | 'ok';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
	readonly triggerLabel: string;
	readonly triggerBothTicks: boolean;
	readonly canFix: boolean;
	readonly fixDescription: string | undefined;
	readonly codeBreaking: string;
	readonly codeFixed: string | undefined;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'perfectly-optimized',
		label: 'Perfectly Optimized',
		description:
			'All reference props are memoized; only primitive data changes trigger re-renders. Every signal is genuine, session is EFFECTIVE, and the Render Health Score approaches 100.',
		badge: 'ok',
		triggerLabel: 'Change data',
		triggerBothTicks: false,
		canFix: false,
		fixDescription: undefined,
		codeBreaking: `// ✅ Stable refs + genuine primitive data change
const Parent = () => {
  const [counter, setCounter] = useState(0);
  const onClick = useCallback(() => {}, []);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  return (
    <Dashboard
      onClick={onClick}
      config={config}
      title={String(counter)}
    />
  );
};`,
		codeFixed: undefined,
	},
	{
		id: 'inline-callback-hell',
		label: 'Inline Callback Hell',
		description:
			'All callbacks are defined inline — new function references on every parent render. Signals are reference-only, session is INEFFECTIVE, and score is penalized for both unstable props and memo ineffectiveness.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
		triggerBothTicks: false,
		canFix: true,
		fixDescription: 'Stabilize all callbacks with useCallback.',
		codeBreaking: `// ❌ Every callback is a new reference on every render
const Parent = () => (
  <Dashboard
    onClick={() => doA()}
    onHover={() => doB()}
    onDismiss={() => doC()}
  />
);`,
		codeFixed: `// ✅ Memoized callbacks — memo can now skip re-renders
const Parent = () => {
  const onClick = useCallback(() => doA(), []);
  const onHover = useCallback(() => doB(), []);
  const onDismiss = useCallback(() => doC(), []);
  return <Dashboard onClick={onClick} onHover={onHover} onDismiss={onDismiss} />;
};`,
	},
	{
		id: 'inline-object-instability',
		label: 'Object Instability',
		description:
			'Config and items are declared inline — fresh object/array references on every render. Score is penalized for both unstable props and INEFFECTIVE session even though the data is unchanged.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
		triggerBothTicks: false,
		canFix: true,
		fixDescription: 'Stabilize config and items with useMemo.',
		codeBreaking: `// ❌ New object + array references on every render
const Parent = () => (
  <Dashboard
    config={{ theme: 'dark', density: 'compact' }}
    items={['revenue', 'users', 'churn']}
  />
);`,
		codeFixed: `// ✅ Stable references — memo can skip these re-renders
const Parent = () => {
  const config = useMemo(() => ({ theme: 'dark', density: 'compact' }), []);
  const items = useMemo(() => ['revenue', 'users', 'churn'], []);
  return <Dashboard config={config} items={items} />;
};`,
	},
	{
		id: 'memo-defeated',
		label: 'Memo Defeated',
		description:
			'All prop changes are reference-only with no genuine data change. React.memo is completely defeated — every render is wasteful. Score tanks from both INEFFECTIVE session and high unstable-props penalty.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
		triggerBothTicks: false,
		canFix: true,
		fixDescription: 'Stabilize all reference props with useCallback and useMemo to restore memo effectiveness.',
		codeBreaking: `// ❌ Everything is a new reference — memo cannot skip a single render
const Parent = () => (
  <Dashboard
    onClick={() => {}}
    config={{ theme: 'dark' }}
    tags={['admin', 'power-user']}
  />
);`,
		codeFixed: `// ✅ Stable refs restore memo's ability to skip renders
const Parent = () => {
  const onClick = useCallback(() => {}, []);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  const tags = useMemo(() => ['admin', 'power-user'], []);
  return <Dashboard onClick={onClick} config={config} tags={tags} />;
};`,
	},
	{
		id: 'partial-memo',
		label: 'Partial Memo',
		description:
			'Each trigger changes both a primitive prop and a reference prop in the same batched render. Signals are mixed — PARTIALLY_EFFECTIVE session. Score is reduced by the Mixed Signal Penalty.',
		badge: 'warn',
		triggerLabel: 'Re-render + change data',
		triggerBothTicks: true,
		canFix: true,
		fixDescription: 'Stabilize the reference props so all remaining signals become genuinely data-driven.',
		codeBreaking: `// ❌ Mixed signals: primitive data + new reference in same render
const Parent = () => {
  const [data, setData] = useState(0);
  return (
    <Dashboard
      title={String(data)}
      onClick={() => {}}  // new ref every render
    />
  );
};`,
		codeFixed: `// ✅ Stable ref removes the reference-only component
const Parent = () => {
  const [data, setData] = useState(0);
  const onClick = useCallback(() => {}, []);
  return <Dashboard title={String(data)} onClick={onClick} />;
};`,
	},
	{
		id: 'high-frequency',
		label: 'High Frequency',
		description:
			'Rapid re-renders push the frequency class to HIGH. Even with genuine prop changes, a HIGH frequency classification adds a frequency penalty to the score and triggers a HIGH_FREQUENCY_CLEAN recommendation.',
		badge: 'warn',
		triggerLabel: 'Rapid re-renders',
		triggerBothTicks: false,
		canFix: false,
		fixDescription: undefined,
		codeBreaking: `// ⚠ Data-driven but rendering very frequently
const LiveTicker = () => {
  const [price, setPrice] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPrice(p => p + 1), 50);
    return () => clearInterval(id);
  }, []);
  return <Dashboard title={String(price)} />;
};`,
		codeFixed: undefined,
	},
	{
		id: 'deep-cascade',
		label: 'Deep Cascade',
		description:
			'Multiple rapid parent re-renders with mixed prop changes. Signals accumulate in the FIFO window — session degrades to PARTIALLY_EFFECTIVE, score reflects both frequency and instability penalties.',
		badge: 'warn',
		triggerLabel: 'Cascade renders',
		triggerBothTicks: true,
		canFix: true,
		fixDescription: 'Break the cascade by stabilizing reference props at the parent level.',
		codeBreaking: `// ❌ Cascading renders propagate inline references all the way down
const Root = () => {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState(0);
  return (
    <Dashboard
      config={{ density: tick % 2 ? 'compact' : 'default' }}
      title={String(data)}
      onClick={() => setData(d => d + 1)}
    />
  );
};`,
		codeFixed: `// ✅ Memoize config and stabilize callback to prevent cascade
const Root = () => {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState(0);
  const config = useMemo(() => ({ density: tick % 2 ? 'compact' : 'default' }), [tick]);
  const onClick = useCallback(() => setData(d => d + 1), []);
  return <Dashboard config={config} title={String(data)} onClick={onClick} />;
};`,
	},
];
