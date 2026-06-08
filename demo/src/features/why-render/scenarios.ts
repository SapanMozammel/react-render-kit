export type ScenarioId = 'inline-object' | 'inline-callback' | 'real-change' | 'stable-props';

export type ScenarioBadge = 'warn' | 'ok';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
	readonly canFix: boolean;
	readonly fixDescription: string | undefined;
	readonly triggerLabel: string;
	readonly codeBreaking: string;
	readonly codeFixed: string | undefined;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'inline-object',
		label: 'Inline object',
		description:
			'Parent passes user={{ id: 1, role: "admin" }} as a literal. React creates a new object reference every render — same data, new identity.',
		badge: 'warn',
		canFix: true,
		fixDescription: 'Wrap the object with useMemo so the reference stays stable across parent re-renders.',
		triggerLabel: 'Re-render parent',
		codeBreaking: `// ❌ New object created on every parent render
const Parent = () => (
  <UserCard
    user={{ id: 1, role: 'admin' }}
    onSave={stableCallback}
  />
);`,
		codeFixed: `// ✅ Stable reference — same object across renders
const Parent = () => {
  const user = useMemo(
    () => ({ id: 1, role: 'admin' }),
    [],
  );
  return <UserCard user={user} onSave={stableCallback} />;
};`,
	},
	{
		id: 'inline-callback',
		label: 'Inline callback',
		description:
			'Parent passes onSave={() => save(userId)} as an inline arrow function. A new function reference is created on every render, even when nothing changed.',
		badge: 'warn',
		canFix: true,
		fixDescription: 'Wrap the function with useCallback so the reference stays stable across parent re-renders.',
		triggerLabel: 'Re-render parent',
		codeBreaking: `// ❌ New function created on every parent render
const Parent = () => (
  <UserCard
    user={stableUser}
    onSave={() => save(userId)}
  />
);`,
		codeFixed: `// ✅ Stable reference — same function across renders
const Parent = () => {
  const onSave = useCallback(
    () => save(userId),
    [userId],
  );
  return <UserCard user={stableUser} onSave={onSave} />;
};`,
	},
	{
		id: 'real-change',
		label: 'Real data change',
		description:
			'The name prop genuinely changed from "Alice" to "Bob". This is a legitimate re-render — useWhyRender confirms exactly what changed.',
		badge: 'ok',
		canFix: false,
		fixDescription: undefined,
		triggerLabel: 'Change name',
		codeBreaking: `// ✅ Data actually changed — this re-render is correct
const Parent = ({ name }: { name: string }) => (
  <UserCard name={name} user={stableUser} onSave={stableCallback} />
);`,
		codeFixed: undefined,
	},
	{
		id: 'stable-props',
		label: 'Stable props',
		description:
			'All props are memoized. The parent re-renders but passes identical references — useWhyRender detects no changes and stays silent.',
		badge: 'ok',
		canFix: false,
		fixDescription: undefined,
		triggerLabel: 'Re-render parent',
		codeBreaking: `// ✅ Goal state — all props stabilized
const Parent = () => {
  const user = useMemo(() => ({ id: 1, role: 'admin' }), []);
  const onSave = useCallback(() => save(userId), [userId]);
  return <UserCard name="Alice" user={user} onSave={onSave} />;
};`,
		codeFixed: undefined,
	},
];
