# @sapanmozammel/memo-effect-analyzer

Development-only React hook that classifies the effectiveness of `React.memo` by analyzing prop change history.

## Install

```sh
npm install @sapanmozammel/memo-effect-analyzer
```

## Usage

```ts
import { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';

const UserCard = React.memo((props: UserCardProps) => {
  useMemoEffectAnalyzer('UserCard', props as Record<string, unknown>);
  // ...
});
```

## Options

| Option             | Type       | Default | Description                                      |
| ------------------ | ---------- | ------- | ------------------------------------------------ |
| `enabled`          | `boolean`  | `true`  | Disable the hook without removing it             |
| `ignoreProps`      | `string[]` | `[]`    | Prop keys excluded from analysis                 |
| `maxReports`       | `number`   | `10`    | Maximum grouped console entries per instance     |
| `logOnEveryRender` | `boolean`  | `false` | Emit a single `console.log` on stable re-renders |

## Session classifications

| Classification        | Meaning                                                                         |
| --------------------- | ------------------------------------------------------------------------------- |
| `EFFECTIVE`           | All observed re-renders were data-driven; props are compatible with memoization |
| `INEFFECTIVE`         | Under current prop stability, React.memo would not skip these re-renders        |
| `PARTIALLY_EFFECTIVE` | Mix of genuine data changes and reference instability                           |
| `NOT_APPLICABLE`      | No re-renders observed yet                                                      |

Zero production bundle cost — the hook is a no-op when `NODE_ENV !== 'development'`.
