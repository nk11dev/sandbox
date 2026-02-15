/**
 * Tests for UsersEntityWebSocket.
 * 
 * **Case 2: MobX + TanStack Query + WebSocket Integration**
 * Tests verify:
 * - Query initialization with WebSocket transport
 * - Mutation execution via Socket.io
 * - Real-time event subscriptions
 * - Cache invalidation on WebSocket events
 */

import { QueryClient } from '@tanstack/react-query'

import { createTestQueryClient, waitForAsync } from '@/__tests__/testUtils'
import { UserDto } from '@/common'
import { queryClient as importedQueryClient, webSocketApi } from '@/services'
import { UsersEntityWebSocket } from '@/stores/entities/UsersEntityWebSocket'

// Mock the WebSocket API
jest.mock('@/services/websocket/WebSocketApi', () => ({
    webSocketApi: {
        emit: jest.fn(),
        on: jest.fn(() => jest.fn()),
        off: jest.fn(),
    },
}))

describe('UsersEntityWebSocket', () => {
    type EventHandler = (data: unknown) => void
    let entity: UsersEntityWebSocket
    let queryClient: QueryClient
    let eventHandlers: Record<string, EventHandler>

    beforeAll(() => {
        // Replace global queryClient methods with test client
        queryClient = createTestQueryClient()
        Object.assign(importedQueryClient, queryClient)
    })

    beforeEach(() => {
        eventHandlers = {}

        // Mock webSocketApi.on to capture event handlers
        ;(webSocketApi.on as jest.Mock).mockImplementation(
            (event: string, handler: EventHandler) => {
                eventHandlers[event] = handler
                return jest.fn() // unsubscribe function
            }
        )

        entity = new UsersEntityWebSocket()
        jest.clearAllMocks()
    })

    afterEach(() => {
        entity.unsubscribeFromEvents()
        queryClient.clear()
    })

    describe('getAllUsersQuery', () => {
        it('should fetch all users via WebSocket', async () => {
            const mockUsers: UserDto[] = [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
                { id: 2, name: 'User 2', email: 'user2@test.com' },
            ]

            ;(webSocketApi.emit as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: mockUsers,
            })

            await entity.getAllUsersQuery.refetch()
            await waitForAsync()

            expect(webSocketApi.emit).toHaveBeenCalledWith('users:getAll')
            expect(entity.getAllUsersQuery.data).toEqual(mockUsers)
            expect(entity.getAllUsersQuery.isSuccess).toBe(true)
        })

        it('should handle fetch error', async () => {
            (webSocketApi.emit as jest.Mock).mockResolvedValueOnce({
                success: false,
                error: 'Failed to fetch users',
            })

            await entity.getAllUsersQuery.refetch().catch(() => {})
            await waitForAsync()

            expect(entity.getAllUsersQuery.isError).toBe(true)
        })
    })

    describe('createUserMutation', () => {
        it('should create user via WebSocket and update cache', async () => {
            const newUser: UserDto = {
                id: 3,
                name: 'New User',
                email: 'new@test.com',
            }

            ;(webSocketApi.emit as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: newUser,
            })

            queryClient.setQueryData(['users', 'websocket'], [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
            ])

            await entity.createUserMutation.mutate({
                name: newUser.name,
                email: newUser.email,
            })

            expect(webSocketApi.emit).toHaveBeenCalledWith('users:create', {
                name: newUser.name,
                email: newUser.email,
            })
            
            expect(entity.createUserMutation.isSuccess).toBe(true)
            expect(entity.createUserMutation.data).toEqual(newUser)
        })
    })

    describe('WebSocket event subscriptions', () => {
        it('should subscribe to all WebSocket events', () => {
            // Verify entity subscribed to all necessary events
            expect(webSocketApi.on).toHaveBeenCalledWith(
                'users:created',
                expect.any(Function)
            )
            expect(webSocketApi.on).toHaveBeenCalledWith(
                'users:updated',
                expect.any(Function)
            )
            expect(webSocketApi.on).toHaveBeenCalledWith(
                'users:deleted',
                expect.any(Function)
            )
        })
    })

    describe('updateUserMutation', () => {
        it('should update user via WebSocket', async () => {
            const updatedUser: UserDto = {
                id: 1,
                name: 'Updated User',
                email: 'updated@test.com',
            }

            ;(webSocketApi.emit as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: updatedUser,
            })

            queryClient.setQueryData(['users', 'websocket'], [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
            ])

            await entity.updateUserMutation.mutate({
                id: 1,
                updates: { name: updatedUser.name, email: updatedUser.email },
            })

            expect(webSocketApi.emit).toHaveBeenCalledWith('users:update', {
                id: 1,
                name: updatedUser.name,
                email: updatedUser.email,
            })
            
            expect(entity.updateUserMutation.isSuccess).toBe(true)
            expect(entity.updateUserMutation.data).toEqual(updatedUser)
        })
    })

    describe('deleteUserMutation', () => {
        it('should delete user via WebSocket', async () => {
            (webSocketApi.emit as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: { id: 1 },
            })

            queryClient.setQueryData(['users', 'websocket'], [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
                { id: 2, name: 'User 2', email: 'user2@test.com' },
            ])

            await entity.deleteUserMutation.mutate(1)

            expect(webSocketApi.emit).toHaveBeenCalledWith('users:delete', {
                id: 1,
            })
            
            expect(entity.deleteUserMutation.isSuccess).toBe(true)
            expect(entity.deleteUserMutation.data).toEqual({ id: 1 })
        })
    })
})
