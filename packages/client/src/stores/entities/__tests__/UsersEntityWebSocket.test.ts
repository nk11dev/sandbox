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
import { webSocketApi } from '@/services'
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

    beforeEach(() => {
        queryClient = createTestQueryClient()
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
            await waitForAsync()

            expect(webSocketApi.emit).toHaveBeenCalledWith('users:create', {
                name: newUser.name,
                email: newUser.email,
            })

            const cachedUsers = queryClient.getQueryData<UserDto[]>([
                'users',
                'websocket',
            ])
            expect(cachedUsers).toHaveLength(2)
            expect(cachedUsers?.[1]).toEqual(newUser)
        })
    })

    describe('WebSocket event subscriptions', () => {
        it('should subscribe to users:created event', () => {
            expect(webSocketApi.on).toHaveBeenCalledWith(
                'users:created',
                expect.any(Function)
            )
            expect(eventHandlers['users:created']).toBeDefined()
        })

        it('should subscribe to users:updated event', () => {
            expect(webSocketApi.on).toHaveBeenCalledWith(
                'users:updated',
                expect.any(Function)
            )
            expect(eventHandlers['users:updated']).toBeDefined()
        })

        it('should subscribe to users:deleted event', () => {
            expect(webSocketApi.on).toHaveBeenCalledWith(
                'users:deleted',
                expect.any(Function)
            )
            expect(eventHandlers['users:deleted']).toBeDefined()
        })

        it('should invalidate cache on users:created event', async () => {
            const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

            // Trigger the event
            if (eventHandlers['users:created']) {
                eventHandlers['users:created']({})
            }

            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: ['users', 'websocket'],
            })
        })

        it('should invalidate cache on users:updated event', () => {
            const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

            if (eventHandlers['users:updated']) {
                eventHandlers['users:updated']({ id: 1 })
            }

            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: ['users', 'websocket'],
            })
        })

        it('should invalidate cache on users:deleted event', () => {
            const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

            if (eventHandlers['users:deleted']) {
                eventHandlers['users:deleted']({ id: 1 })
            }

            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: ['users', 'websocket'],
            })
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
            await waitForAsync()

            expect(webSocketApi.emit).toHaveBeenCalledWith('users:update', {
                id: 1,
                name: updatedUser.name,
                email: updatedUser.email,
            })

            const cachedUsers = queryClient.getQueryData<UserDto[]>([
                'users',
                'websocket',
            ])
            expect(cachedUsers?.[0]).toEqual(updatedUser)
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
            await waitForAsync()

            expect(webSocketApi.emit).toHaveBeenCalledWith('users:delete', {
                id: 1,
            })

            const cachedUsers = queryClient.getQueryData<UserDto[]>([
                'users',
                'websocket',
            ])
            expect(cachedUsers).toHaveLength(1)
            expect(cachedUsers?.[0].id).toBe(2)
        })
    })
})
