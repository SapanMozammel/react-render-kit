export type ScenarioId = 'inline-props' | 'stable-props' | 'mixed-props' | 'data-change';
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
		id: 'inline-props',
		label: 'Inline Props',
		description:
			'onAction, config, and tags are all passed inline — new references on every parent render. Every signal is reference-only. Under current prop stability, React.memo would not skip these re-renders.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
		triggerBothTicks: false,
		canFix: true,
		fixDescription: 'Stabilize references with useCallback (functions) and useMemo (objects/arrays).',
		codeBreaking: `// ❌ New references on every parent render
const Parent = () => (
  <UserCard
    onAction={() => handleAction(id)}
    config={{ theme: 'dark' }}
    tags={['admin']}
  />
);`,
		codeFixed: `// ✅ Stable references — memo now positioned to skip re-renders
const Parent = () => {
  const onAction = useCallback(() => handleAction(id), [id]);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  const tags = useMemo(() => ['admin'], []);
  return <UserCard onAction={onAction} config={config} tags={tags} />;
};`,
	},
	{
		id: 'stable-props',
		label: 'Stable Props',
		description:
			'onAction and config are memoized; label is a changing primitive. Every re-render carries a real data change — signals are all genuine. Props are compatible with memoization.',
		badge: 'ok',
		triggerLabel: 'Change data',
		triggerBothTicks: false,
		canFix: false,
		fixDescription: undefined,
		codeBreaking: `// ✅ Stable refs + genuine data change
const Parent = () => {
  const onAction = useCallback(() => handleAction(id), [id]);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  return <UserCard onAction={onAction} config={config} label={label} />;
};`,
		codeFixed: undefined,
	},
	{
		id: 'mixed-props',
		label: 'Mixed Props',
		description:
			'Each click changes both a primitive prop (label) and unstable references (onAction, config) in a single batched render. Signals are mixed — genuine and reference changes coexist.',
		badge: 'warn',
		triggerLabel: 'Re-render + change data',
		triggerBothTicks: true,
		canFix: true,
		fixDescription: 'Stabilize onAction and config to eliminate the reference-side component of each mixed signal.',
		codeBreaking: `// ❌ Inline refs + genuine data change in same render (batched)
const Parent = () => {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState(0);

  return (
    <UserCard
      onAction={() => {}}             // new ref every render
      config={{ theme: 'dark' }}      // new ref every render
      label={String(data)}
    />
  );
};`,
		codeFixed: `// ✅ Stable refs; only genuine data changes remain
const Parent = () => {
  const onAction = useCallback(() => {}, []);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  return <UserCard onAction={onAction} config={config} label={label} />;
};`,
	},
	{
		id: 'data-change',
		label: 'Data Change',
		description:
			'A primitive prop (label) changes each click while all reference props remain stable. Every signal is genuine — the data genuinely changed, and props are compatible with memoization.',
		badge: 'ok',
		triggerLabel: 'Change data',
		triggerBothTicks: false,
		canFix: false,
		fixDescription: undefined,
		codeBreaking: `// ✅ All reference props stable; primitive prop changes
const Parent = () => {
  const [counter, setCounter] = useState(0);
  const onAction = useCallback(() => {}, []);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  return (
    <UserCard
      onAction={onAction}
      config={config}
      label={String(counter)}
    />
  );
};`,
		codeFixed: undefined,
	},
];
