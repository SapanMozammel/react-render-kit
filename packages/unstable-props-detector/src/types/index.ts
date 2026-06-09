export type PropType = 'function' | 'array' | 'object';

export type PropInstability = {
	name: string;
	type: PropType;
};

export type UnstablePropsOptions = {
	enabled?: boolean;
	ignoreProps?: string[];
	maxReports?: number;
	logOnEveryRender?: boolean;
};
