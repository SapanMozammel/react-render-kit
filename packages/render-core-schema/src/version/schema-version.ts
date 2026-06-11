export type SchemaVersion = `${number}.${number}.${number}`;

export const CURRENT_SCHEMA_VERSION = '1.0.0' as const satisfies SchemaVersion;
