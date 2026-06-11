export type ComponentId = string;
export type SessionId = string;

export type ComponentMeta = {
	readonly componentName: string;
	readonly displayName?: string;
	readonly filePath?: string;
};
