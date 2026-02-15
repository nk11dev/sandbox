import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dotenvDefaults from 'dotenv-defaults'
import dotenvParseVariables from 'dotenv-parse-variables'

export default defineConfig(({ mode }) => {
    // Load env from root .env.defaults and .env
    const rawEnv = dotenvDefaults.config({
        path: resolve(__dirname, '../../.env'),
        defaults: resolve(__dirname, '../../.env.defaults'),
    })
    const env = dotenvParseVariables(rawEnv.parsed || {})

    const PORT_CLIENT = (env.PORT_CLIENT as number) || 3000
    const PORT_SERVER = (env.PORT_SERVER as number) || 5000
    const API_PATH = (env.API_PATH as string) || '/api'

    return {
        plugins: [
            react({
                babel: {
                    plugins: [
                        ['@babel/plugin-proposal-decorators', { legacy: true }],
                        ['@babel/plugin-transform-class-properties', { loose: true }],
                    ],
                },
            }),
        ],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@/common': resolve(__dirname, '../common/src'),
            },
        },
        server: {
            port: PORT_CLIENT,
            proxy: {
                [API_PATH]: {
                    target: `http://localhost:${PORT_SERVER}`,
                    changeOrigin: true,
                },
                '/socket.io': {
                    target: `http://localhost:${PORT_SERVER}`,
                    ws: true,
                },
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: true,
        },
        define: {
            'process.env.PORT_CLIENT': JSON.stringify(PORT_CLIENT),
            'process.env.PORT_SERVER': JSON.stringify(PORT_SERVER),
            'process.env.API_HOST': JSON.stringify(env.API_HOST || ''),
            'process.env.API_PATH': JSON.stringify(API_PATH),
        },
    }
})
