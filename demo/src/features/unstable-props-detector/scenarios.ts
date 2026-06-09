export type ScenarioId = 'inline-props' | 'stable-props' | 'mixed-props' | 'ignore-list';
export type ScenarioBadge = 'warn' | 'ok';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
	readonly triggerLabel: string;
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
			'Parent passes onSelect, config, and tags as inline literals. Every render creates new references — React.memo is defeated for all three props.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
		canFix: true,
		fixDescription: 'Wrap each prop with useCallback (functions) or useMemo (objects and arrays) to stabilize references.',
		codeBreaking: `// ❌ New references created on every parent render
const Parent = () => (
  <SettingsPanel
    onSelect={() => setSelected(id)}
    config={{ theme: 'dark' }}
    tags={['admin']}
  />
);`,
		codeFixed: `// ✅ Stable references — memo can now do its job
const Parent = () => {
  const onSelect = useCallback(() => setSelected(id), [id]);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  const tags = useMemo(() => ['admin'], []);
  return <SettingsPanel onSelect={onSelect} config={config} tags={tags} />;
};`,
	},
	{
		id: 'stable-props',
		label: 'Stable Props',
		description:
			'All props are memoized. The parent re-renders but passes identical references — the hook confirms stability on every render with logOnEveryRender: true.',
		badge: 'ok',
		triggerLabel: 'Re-render parent',
		canFix: false,
		fixDescription: undefined,
		codeBreaking: `// ✅ Goal state — all references stabilized
const Parent = () => {
  const onSelect = useCallback(() => setSelected(id), [id]);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  const tags = useMemo(() => ['admin'], []);
  return (
    <SettingsPanel
      onSelect={onSelect}
      config={config}
      tags={tags}
    />
  );
};`,
		codeFixed: undefined,
	},
	{
		id: 'mixed-props',
		label: 'Mixed Props',
		description:
			'onSelect is stabilized with useCallback, but config and tags are still inline. Partial stabilization is not enough — React.memo still re-renders on every config or tags change.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
		canFix: true,
		fixDescription: 'All unstable props must be stabilized — a partial fix leaves memo unable to skip re-renders.',
		codeBreaking: `// ❌ Partial fix — onSelect stable but config/tags still inline
const Parent = () => {
  const onSelect = useCallback(() => setSelected(id), [id]);
  return (
    <SettingsPanel
      onSelect={onSelect}
      config={{ theme: 'dark' }}
      tags={['admin']}
    />
  );
};`,
		codeFixed: `// ✅ All three props stabilized
const Parent = () => {
  const onSelect = useCallback(() => setSelected(id), [id]);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  const tags = useMemo(() => ['admin'], []);
  return <SettingsPanel onSelect={onSelect} config={config} tags={tags} />;
};`,
	},
	{
		id: 'ignore-list',
		label: 'Ignore List',
		description:
			'onSelect is intentionally inline (a known false positive), so it is listed in ignoreProps. The remaining props are stable — the hook confirms silence on every render.',
		badge: 'ok',
		triggerLabel: 'Re-render parent',
		canFix: false,
		fixDescription: undefined,
		codeBreaking: `// ✅ Known unstable prop suppressed via ignoreProps
const Parent = () => (
  <SettingsPanel
    onSelect={() => setSelected(id)}   // intentionally inline
    config={stableConfig}
    tags={stableTags}
  />
);

// In the component:
useUnstablePropsDetector('SettingsPanel', props, {
  ignoreProps: ['onSelect'],
  logOnEveryRender: true,
});`,
		codeFixed: undefined,
	},
];
