/**
 * Utility functions and mocks for testing.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'

/**
 * Creates a fresh QueryClient for tests.
 * Disables retries and sets short cache times.
 */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    })
}

/**
 * Wrapper component that provides QueryClient context.
 */
interface TestProvidersProps {
    children: ReactNode
    queryClient?: QueryClient
}

export function TestProviders({
    children,
    queryClient = createTestQueryClient(),
}: TestProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

/**
 * Custom render function that wraps components with necessary providers.
 */
export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'> & {
        queryClient?: QueryClient
    }
) {
    const { queryClient, ...renderOptions } = options || {}

    return render(ui, {
        wrapper: ({ children }) => (
            <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
        ...renderOptions,
    })
}

/**
 * Waits for all pending promises to resolve.
 * Useful for waiting for async state updates.
 */
export function waitForAsync(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Mock HTTP API responses.
 */
export const mockHttpApi = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
}

/**
 * Mock WebSocket API.
 */
export const mockWebSocketApi = {
    emit: jest.fn(),
    on: jest.fn(() => () => {}),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
}

/**
 * Reset all mocks between tests.
 */
export function resetAllMocks() {
    jest.clearAllMocks()
    mockHttpApi.get.mockReset()
    mockHttpApi.post.mockReset()
    mockHttpApi.put.mockReset()
    mockHttpApi.delete.mockReset()
    mockWebSocketApi.emit.mockReset()
    mockWebSocketApi.on.mockReset()
    mockWebSocketApi.off.mockReset()
}
