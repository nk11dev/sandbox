/**
 * Gets environment variable with fallback.
 * 
 * @param key - Environment variable key
 * @param defaultValue - Default value if env var is not set
 * @returns Environment variable value or default
 */
export function getEnv(key: string, defaultValue: string | number): string | number {
    const value = process.env[key]
    return value !== undefined ? value : defaultValue
}

/**
 * Gets API base URL based on environment.
 * 
 * @returns Full API URL
 */
export function getApiUrl(): string {
    const apiHost = getEnv('API_HOST', '') as string
    const apiPath = getEnv('API_PATH', '/api') as string
    
    if (apiHost) {
        return `${apiHost}${apiPath}`
    }
    
    // In development, proxy handles the API path
    // In production, API is served from the same origin
    return apiPath
}

/**
 * Gets WebSocket URL based on environment.
 * 
 * @returns WebSocket URL
 */
export function getWebSocketUrl(): string {
    const apiHost = getEnv('API_HOST', '') as string
    
    if (apiHost) {
        return apiHost
    }
    
    // In development and production, connect to same origin
    return window.location.origin
}
