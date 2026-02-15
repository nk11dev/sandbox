/// <reference types="vite/client" />

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT_CLIENT: number
            PORT_SERVER: number
            API_HOST: string
            API_PATH: string
        }
    }
}

export {}
