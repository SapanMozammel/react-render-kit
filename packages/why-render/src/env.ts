export const isDev: boolean = typeof process !== 'undefined' && process.env !== null && process.env !== undefined && process.env.NODE_ENV !== 'production';
