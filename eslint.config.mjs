import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import unicornPlugin from 'eslint-plugin-unicorn';

/** @type {import('eslint').Linter.Config[]} */
export default [
	// TypeScript source + test files across all workspace packages
	{
		files: ['packages/*/src/**/*.{ts,tsx}', 'packages/*/tests/**/*.{ts,tsx}'],
		plugins: {
			prettier: prettierPlugin,
			'@typescript-eslint': typescriptPlugin,
			react: reactPlugin,
			'react-hooks': reactHooksPlugin,
			unicorn: unicornPlugin,
		},
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				ecmaFeatures: { jsx: true },
				ecmaVersion: 2022,
				sourceType: 'module',
			},
		},
		settings: {
			react: { version: 'detect' },
		},
		rules: {
			// Prettier — config auto-detected from root .prettierrc.js
			'prettier/prettier': 'error',

			// TypeScript recommended + strict additions
			...typescriptPlugin.configs.recommended.rules,
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', fixStyle: 'inline-type-imports' },
			],

			// Code quality
			'max-len': ['error', {
				code: 220,
				ignoreUrls: true,
				ignoreStrings: true,
				ignoreTemplateLiterals: true,
				ignoreComments: true,
			}],
			'no-console': 'warn',
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			'eqeqeq': ['error', 'always'],
			'curly': ['error', 'all'],
			'no-duplicate-imports': 'error',
			'object-shorthand': 'error',
			'prefer-template': 'error',
			'no-eval': 'error',
			'no-implied-eval': 'error',

			// React (React 17+ JSX transform — no import needed)
			'react/jsx-uses-react': 'off',
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'react/jsx-key': 'error',
			'react/jsx-no-duplicate-props': 'error',
			'react/jsx-no-undef': 'error',
			'react/jsx-no-target-blank': 'error',
			'react/no-unescaped-entities': 'off',
			'react/self-closing-comp': 'error',

			// React Hooks
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',

			// Filename casing — kebab-case (CLAUDE.md convention)
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			// Disable rules that conflict with Prettier
			...prettierConfig.rules,
		},
	},

	// JS/MJS/CJS config files at workspace root (sync.js, vitest.config.ts wrapper, etc.)
	{
		files: ['*.js', '*.mjs', '*.cjs', '.formatter/**/*.js'],
		plugins: { prettier: prettierPlugin },
		rules: {
			'prettier/prettier': 'error',
			'no-console': 'warn',
			'prefer-const': 'error',
			'no-var': 'error',
		},
	},

	// Ignores
	{
		ignores: [
			'node_modules/**',
			'packages/*/node_modules/**',
			'packages/*/dist/**',
			'dist/**',
			'**/*.min.js',
			'**/*.min.css',
			'coverage/**',
			'.cache/**',
		],
	},
];
