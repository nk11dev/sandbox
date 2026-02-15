import { getApiUrl } from '@/utils/env'

/**
 * HTTP API service for making requests to the server.
 * Provides type-safe methods for GET, POST, PUT, DELETE operations.
 */
class HttpApi {
    private baseUrl: string

    constructor() {
        this.baseUrl = `${getApiUrl()}/http`
    }

    /**
     * Makes a GET request.
     * 
     * @param endpoint - API endpoint (e.g., '/users')
     * @returns Promise with response data
     */
    async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Makes a POST request.
     * 
     * @param endpoint - API endpoint (e.g., '/users')
     * @param data - Request body data
     * @returns Promise with response data
     */
    async post<T>(endpoint: string, data: unknown): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Makes a PUT request.
     * 
     * @param endpoint - API endpoint (e.g., '/users/1')
     * @param data - Request body data
     * @returns Promise with response data
     */
    async put<T>(endpoint: string, data: unknown): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Makes a DELETE request.
     * 
     * @param endpoint - API endpoint (e.g., '/users/1')
     * @returns Promise with response data
     */
    async delete<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
    }
}

export const httpApi = new HttpApi()
