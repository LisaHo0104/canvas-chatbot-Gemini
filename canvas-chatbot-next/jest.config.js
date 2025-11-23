const nextJest = require('next/jest');

const createJestConfig = nextJest({
	dir: './',
});

const customJestConfig = {
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	collectCoverageFrom: [
		'src/**/*.{js,jsx,ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/*.stories.{js,jsx,ts,tsx}',
		'!src/**/__tests__/**/*.{js,jsx,ts,tsx}',
	],
	testPathIgnorePatterns: ['/node_modules/', '/.next/', '/cypress/', '/e2e/'],
	transformIgnorePatterns: [
		'/node_modules/',
		'^.+\\.module\\.(css|sass|scss)$',
	],
	moduleDirectories: ['node_modules', 'src'],
	coverageThreshold: {
		'**/src/ui/atoms/**': {
			lines: 100,
			statements: 100,
			functions: 100,
		},
	},
};

module.exports = createJestConfig(customJestConfig);