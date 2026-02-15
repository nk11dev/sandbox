export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.+(spec|test).+(ts|tsx|js)',
        '**/?(*.)+(spec|test).+(ts|tsx|js)',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        'testUtils',
        'setupTests',
    ],
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: {
                    jsx: 'react-jsx',
                    esModuleInterop: true,
                    allowSyntheticDefaultImports: true,
                },
            },
        ],
    },
    moduleNameMapper: {
        '^@/__tests__/(.*)$': '<rootDir>/src/__tests__/$1',
        '^@/services$': '<rootDir>/src/services/index.ts',
        '^@/services/(.*)$': '<rootDir>/src/services/$1',
        '^@/stores$': '<rootDir>/src/stores/index.ts',
        '^@/stores/(.*)$': '<rootDir>/src/stores/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/common$': '<rootDir>/../common/src/index.ts',
        '^@/common/(.*)$': '<rootDir>/../common/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
        '!src/**/*.css.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    globals: {
        'ts-jest': {
            tsconfig: {
                jsx: 'react',
            },
        },
    },
}
