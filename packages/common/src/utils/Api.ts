/**
 * Successful API response with data.
 * 
 * @template T - Type of the data payload
 * @property success - Always true for successful responses
 * @property data - The actual data payload
 */
export interface ApiSuccessResponse<T> {
    success: true
    data: T
}

/**
 * Failed API response with error message.
 * 
 * @property success - Always false for error responses
 * @property error - Error message describing what went wrong
 */
export interface ApiErrorResponse {
    success: false
    error: string
}

/**
 * Union type representing any API response.
 * Used for type-safe handling of both successful and failed API calls.
 * 
 * @template T - Type of the data payload for successful responses
 * 
 * @example
 * ```typescript
 * const response: ApiResponse<UserDto[]> = await fetchUsers()
 * if (response.success) {
 *     console.log(response.data) // TypeScript knows this is UserDto[]
 * } else {
 *     console.error(response.error) // TypeScript knows this is string
 * }
 * ```
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Type guard to check if response is successful.
 * 
 * @param response - API response to check
 * @returns True if response is successful, false otherwise
 */
export function isSuccessResponse<T>(
    response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
    return response.success === true
}

/**
 * Type guard to check if response is an error.
 * 
 * @param response - API response to check
 * @returns True if response is an error, false otherwise
 */
export function isErrorResponse<T>(
    response: ApiResponse<T>
): response is ApiErrorResponse {
    return response.success === false
}
