/**
 * Integration test for Users flow.
 * 
 * **Tests all 6 cases in real scenarios:**
 * 
 * Case 1: HTTP Transport Integration
 * Case 2: WebSocket Transport Integration  
 * Case 3: Transport-agnostic component
 * Case 4: Mutations
 * Case 5: Cache reading
 * Case 6: Cache invalidation
 * 
 * **Scenario from requirements:**
 * 1. User is on /users page
 * 2. User sees "Users (HTTP)" and "Users (WebSocket)" blocks
 * 3. User clicks "Create user" button
 * 4. User fills form and clicks "Create"
 * 5. Expected: New user appears in both blocks (HTTP and WebSocket)
 *    - HTTP block: POST request + cache update
 *    - WebSocket block: receives event + cache invalidation + refetch
 */

import { QueryClient } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import React from 'react'

import {
    createTestQueryClient,
    renderWithProviders,
} from '@/__tests__/testUtils'
import { UserDto } from '@/common'
import { UsersList } from '@/components/users/UsersList'
import { httpApi } from '@/services/http/HttpApi'
import { webSocketApi } from '@/services/websocket/WebSocketApi'
import { usersEntityHttp } from '@/stores/entities/UsersEntityHttp'
import { usersEntityWebSocket } from '@/stores/entities/UsersEntityWebSocket'
import { UsersListStateHttp } from '@/stores/state/UsersListStateHttp'
import { UsersListStateWebSocket } from '@/stores/state/UsersListStateWebSocket'

// Mock HTTP API
jest.mock('@/services/http/HttpApi', () => ({
    httpApi: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}))

// Mock WebSocket API
jest.mock('@/services/websocket/WebSocketApi', () => {
    type EventHandler = (data: unknown) => void
    let eventHandlers: Record<string, EventHandler[]> = {}

    return {
        webSocketApi: {
            emit: jest.fn(),
            on: jest.fn((event: string, handler: EventHandler) => {
                if (!eventHandlers[event]) {
                    eventHandlers[event] = []
                }
                eventHandlers[event].push(handler)
                return () => {
                    eventHandlers[event] = eventHandlers[event].filter(
                        (h) => h !== handler
                    )
                }
            }),
            off: jest.fn(),
            _triggerEvent: (event: string, data: unknown) => {
                if (eventHandlers[event]) {
                    eventHandlers[event].forEach((handler) => handler(data))
                }
            },
            _resetHandlers: () => {
                eventHandlers = {}
            },
        },
    }
})

describe('Users Flow Integration Test', () => {
    let queryClient: QueryClient
    let httpState: UsersListStateHttp
    let wsState: UsersListStateWebSocket

    const initialUsers: UserDto[] = [
        { id: 1, name: 'Ivan Ivanov', email: 'ivanov@demo.com' },
        { id: 2, name: 'Petr Petrov', email: 'petrov@demo.com' },
    ]

    beforeEach(() => {
        queryClient = createTestQueryClient()

        // Mock initial data fetch for HTTP
        ;(httpApi.get as jest.Mock).mockResolvedValue({
            success: true,
            data: initialUsers,
        })

        // Mock initial data fetch for WebSocket
        ;(webSocketApi.emit as jest.Mock).mockResolvedValue({
            success: true,
            data: initialUsers,
        })

        httpState = new UsersListStateHttp()
        wsState = new UsersListStateWebSocket()

        jest.clearAllMocks()
    })

    afterEach(() => {
        queryClient.clear()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(webSocketApi as any)._resetHandlers()
    })

    describe('Scenario: Create user via HTTP', () => {
        it('should create user and update both HTTP and WebSocket caches', async () => {
            // Step 1: Load initial data
            await usersEntityHttp.getAllUsersQuery.refetch()
            await usersEntityWebSocket.getAllUsersQuery.refetch()

            // Step 2: Render both blocks
            renderWithProviders(
                <div>
                    <UsersList state={httpState} title="Users by HTTP" />
                    <UsersList state={wsState} title="Users by WebSocket" />
                </div>,
                { queryClient }
            )

            // Verify initial state
            await waitFor(() => {
                expect(screen.getAllByText('Ivan Ivanov')).toHaveLength(2)
            })

            // Step 3: Open create modal in HTTP block
            const createButtons = screen.getAllByText('Create User')
            fireEvent.click(createButtons[0]) // First is HTTP

            // Step 4: Fill form
            const nameInput = screen.getByLabelText('Name')
            const emailInput = screen.getByLabelText('Email')

            fireEvent.change(nameInput, {
                target: { value: 'New User' },
            })
            fireEvent.change(emailInput, {
                target: { value: 'new@test.com' },
            })

            // Step 5: Mock HTTP POST response
            const newUser: UserDto = {
                id: 3,
                name: 'New User',
                email: 'new@test.com',
            }
            ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: newUser,
            })

            // Submit form
            const submitButton = screen.getByText('Create')
            fireEvent.click(submitButton)

            // Step 6: Verify HTTP cache updated
            await waitFor(() => {
                const httpCache = queryClient.getQueryData<UserDto[]>([
                    'users',
                    'http',
                ])
                expect(httpCache).toHaveLength(3)
                expect(httpCache?.[2]).toEqual(newUser)
            })

            // Step 7: Simulate WebSocket event broadcast
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(webSocketApi as any)._triggerEvent('users:created', {})

            // Step 8: Mock refetch for WebSocket
            ;(webSocketApi.emit as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: [...initialUsers, newUser],
            })

            // Step 9: Verify WebSocket cache invalidated and refetched
            await waitFor(
                () => {
                    const wsCache = queryClient.getQueryData<UserDto[]>([
                        'users',
                        'websocket',
                    ])
                    expect(wsCache).toHaveLength(3)
                },
                { timeout: 3000 }
            )
        })
    })

    describe('Case 4: Mutation handling', () => {
        it('should handle mutation with cache update', async () => {
            const newUser: UserDto = {
                id: 3,
                name: 'Test User',
                email: 'test@test.com',
            }

            ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: newUser,
            })

            // Set initial cache
            queryClient.setQueryData(['users', 'http'], initialUsers)

            // Create user
            await usersEntityHttp.createUserMutation.mutate({
                name: newUser.name,
                email: newUser.email,
            })

            // Verify cache updated
            const cache = queryClient.getQueryData<UserDto[]>([
                'users',
                'http',
            ])
            expect(cache).toContainEqual(newUser)
        })
    })

    describe('Case 5: Cache reading', () => {
        it('should read from cache without additional requests', () => {
            // Set cache
            queryClient.setQueryData(['users', 'http'], initialUsers)

            // Read from cache
            const cached = queryClient.getQueryData<UserDto[]>([
                'users',
                'http',
            ])

            expect(cached).toEqual(initialUsers)
            expect(httpApi.get).not.toHaveBeenCalled()
        })
    })

    describe('Case 6: Cache invalidation', () => {
        it('should invalidate cache and trigger refetch', async () => {
            // Set initial cache
            queryClient.setQueryData(['users', 'websocket'], initialUsers)

            // Mock refetch
            ;(webSocketApi.emit as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: [
                    ...initialUsers,
                    { id: 3, name: 'New', email: 'new@test.com' },
                ],
            })

            // Invalidate cache
            await queryClient.invalidateQueries({
                queryKey: ['users', 'websocket'],
            })

            // Wait for refetch
            await waitFor(() => {
                expect(webSocketApi.emit).toHaveBeenCalledWith('users:getAll')
            })
        })
    })

    describe('Case 3: Transport independence', () => {
        it('should render same component with different transports', async () => {
            // Set cache for both transports
            queryClient.setQueryData(['users', 'http'], [initialUsers[0]])
            queryClient.setQueryData(['users', 'websocket'], [
                initialUsers[1],
            ])

            const { rerender } = renderWithProviders(
                <UsersList state={httpState} title="HTTP Users" />,
                { queryClient }
            )

            // Verify HTTP user displayed
            await waitFor(() => {
                expect(screen.getByText('Ivan Ivanov')).toBeInTheDocument()
            })

            // Switch to WebSocket state
            rerender(<UsersList state={wsState} title="WS Users" />)

            // Verify WebSocket user displayed
            await waitFor(() => {
                expect(screen.getByText('Petr Petrov')).toBeInTheDocument()
            })
        })
    })
})
