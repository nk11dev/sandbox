module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:mobx/recommended',
    ],
    plugins: [
        '@typescript-eslint',
        'react',
        'react-hooks',
        'jsx-a11y',
        'mobx',
        'import',
        'unused-imports',
    ],
    settings: {
        react: {
            version: 'detect',
        },
        'import/resolver': {
            typescript: {},
            alias: {
                map: [
                    ['@', './src'],
                    ['@/common', '../common/src'],
                ],
                extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            },
        },
    },
    rules: {
        // Code Style - No semicolons
        'semi': ['error', 'never'],
        
        // Code Style - Single quotes
        'quotes': ['error', 'single', { avoidEscape: true }],
        
        // Code Style - 4-space indentation
        'indent': ['error', 4, { SwitchCase: 1 }],
        
        // Code Style - Max line length 100
        'max-len': ['error', { 
            code: 100,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreComments: true,
            ignoreUrls: true,
        }],
        
        // React - No React import needed in React 18
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        
        // React - Self-closing tags
        'react/self-closing-comp': ['error', {
            component: true,
            html: true,
        }],
        
        // Best Practices - Avoid any/unknown
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        
        // Best Practices - No unused vars/imports
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'error',
            {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_',
            },
        ],
        
        // Best Practices - No empty constructors
        'no-useless-constructor': 'error',
        '@typescript-eslint/no-useless-constructor': 'error',
        
        // Best Practices - Import order
        'import/order': [
            'error',
            {
                groups: [
                    'builtin',
                    'external',
                    'internal',
                    ['parent', 'sibling'],
                    'index',
                    'type',
                ],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
                pathGroups: [
                    {
                        pattern: '@/common/**',
                        group: 'internal',
                        position: 'before',
                    },
                    {
                        pattern: '@/**',
                        group: 'internal',
                    },
                ],
                pathGroupsExcludedImportTypes: ['builtin'],
            },
        ],
        
        // Best Practices - Curly braces for if statements
        'curly': ['error', 'all'],
        
        // Best Practices - Arrow functions always with parens
        'arrow-parens': ['error', 'always'],
    },
    env: {
        browser: true,
        es2020: true,
    },
}
