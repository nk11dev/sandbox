module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
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
        }],
        
        // Best Practices - Avoid any/unknown
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { 
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
        }],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        
        // Best Practices - No empty constructors
        'no-useless-constructor': 'error',
        '@typescript-eslint/no-useless-constructor': 'error',
    },
    env: {
        node: true,
        es2020: true,
    },
}
