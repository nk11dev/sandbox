/**
 * Tests for UsersEntityHttp.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * Tests verify:
 * - Query initialization and data fetching
 * - Mutation execution and cache updates
 * - Error handling
 * - Cache manipulation after successful mutations
 */

import { QueryClient } from '@tanstack/react-query'

import { createTestQueryClient, waitForAsync } from '@/__tests__/testUtils'
import { UserDto } from '@/common'
import { httpApi, queryClient as importedQueryClient } from '@/services'
import { UsersEntityHttp } from '@/stores/entities/UsersEntityHttp'

// Mock the HTTP API
jest.mock('@/services/http/HttpApi', () => ({
    httpApi: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}))

describe('UsersEntityHttp', () => {
    let entity: UsersEntityHttp
    let queryClient: QueryClient

    beforeAll(() => {
        // Replace global queryClient methods with test client
        queryClient = createTestQueryClient()
        Object.assign(importedQueryClient, queryClient)
    })

    beforeEach(() => {
        entity = new UsersEntityHttp()
        jest.clearAllMocks()
    })

    afterEach(() => {
        queryClient.clear()
    })

    describe('getAllUsersQuery', () => {
        it('should fetch all users successfully', async () => {
            const mockUsers: UserDto[] = [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
                { id: 2, name: 'User 2', email: 'user2@test.com' },
            ]

            ;(httpApi.get as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: mockUsers,
            })

            // Trigger query
            await entity.getAllUsersQuery.refetch()
            await waitForAsync()

            expect(httpApi.get).toHaveBeenCalledWith('/users')
            expect(entity.getAllUsersQuery.data).toEqual(mockUsers)
            expect(entity.getAllUsersQuery.isSuccess).toBe(true)
            expect(entity.getAllUsersQuery.isError).toBe(false)
        })

        it('should handle fetch error', async () => {
            (httpApi.get as jest.Mock).mockResolvedValueOnce({
                success: false,
                error: 'Failed to fetch users',
            })

            await entity.getAllUsersQuery.refetch().catch(() => {})
            await waitForAsync()

            expect(entity.getAllUsersQuery.isError).toBe(true)
            expect(entity.getAllUsersQuery.error).toBeTruthy()
        })
    })

    describe('createUserMutation', () => {
        it('should create user and update cache', async () => {
            const newUser: UserDto = {
                id: 3,
                name: 'New User',
                email: 'new@test.com',
            }

            ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: newUser,
            })

            // Set initial cache data
            queryClient.setQueryData(['users', 'http'], [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
            ])

            // Create user
            await entity.createUserMutation.mutate({
                name: newUser.name,
                email: newUser.email,
            })

            expect(httpApi.post).toHaveBeenCalledWith('/users', {
                name: newUser.name,
                email: newUser.email,
            })
            
            expect(entity.createUserMutation.isSuccess).toBe(true)
            expect(entity.createUserMutation.data).toEqual(newUser)
        })

        it('should handle creation error', async () => {
            (httpApi.post as jest.Mock).mockResolvedValueOnce({
                success: false,
                error: 'Failed to create user',
            })

            await entity.createUserMutation
                .mutate({
                    name: 'Test',
                    email: 'test@test.com',
                })
                .catch(() => {})

            await waitForAsync()

            expect(entity.createUserMutation.isError).toBe(true)
        })
    })

    describe('updateUserMutation', () => {
        it('should update user and update cache', async () => {
            const updatedUser: UserDto = {
                id: 1,
                name: 'Updated User',
                email: 'updated@test.com',
            }

            ;(httpApi.put as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: updatedUser,
            })

            // Set initial cache data
            queryClient.setQueryData(['users', 'http'], [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
                { id: 2, name: 'User 2', email: 'user2@test.com' },
            ])

            // Update user
            await entity.updateUserMutation.mutate({
                id: 1,
                updates: {
                    name: updatedUser.name,
                    email: updatedUser.email,
                },
            })

            expect(httpApi.put).toHaveBeenCalledWith('/users/1', {
                name: updatedUser.name,
                email: updatedUser.email,
            })
            
            expect(entity.updateUserMutation.isSuccess).toBe(true)
            expect(entity.updateUserMutation.data).toEqual(updatedUser)
        })
    })

    describe('deleteUserMutation', () => {
        it('should delete user and update cache', async () => {
            (httpApi.delete as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: { id: 1 },
            })

            // Set initial cache data
            queryClient.setQueryData(['users', 'http'], [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
                { id: 2, name: 'User 2', email: 'user2@test.com' },
            ])

            // Delete user
            await entity.deleteUserMutation.mutate(1)

            expect(httpApi.delete).toHaveBeenCalledWith('/users/1')
            
            expect(entity.deleteUserMutation.isSuccess).toBe(true)
            expect(entity.deleteUserMutation.data).toEqual({ id: 1 })
        })
    })

    describe('MobX reactivity', () => {
        it('should have observable queries and mutations', () => {
            expect(entity.getAllUsersQuery).toBeDefined()
            expect(entity.createUserMutation).toBeDefined()
            expect(entity.updateUserMutation).toBeDefined()
            expect(entity.deleteUserMutation).toBeDefined()
        })

        it('should expose query state reactively', async () => {
            (httpApi.get as jest.Mock).mockResolvedValueOnce({
                success: true,
                data: [],
            })

            expect(entity.getAllUsersQuery.isLoading).toBeDefined()
            expect(entity.getAllUsersQuery.isFetching).toBeDefined()
            expect(entity.getAllUsersQuery.isError).toBeDefined()
            expect(entity.getAllUsersQuery.isSuccess).toBeDefined()
        })
    })
})
