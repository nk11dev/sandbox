import { makeObservable, observable } from 'mobx'

import { ApiResponse, UserDto, UserId } from '@/common'
import { MobxMutation, MobxQuery, queryClient, webSocketApi } from '@/services'

/**
 * Entity store for Users with WebSocket transport.
 * Manages data fetching and mutations for user entities via Socket.io.
 * 
 * **Case 2: MobX + TanStack Query + WebSocket Integration**
 * This class demonstrates:
 * - Using MobxQuery with WebSocket as transport
 * - Using MobxMutation with WebSocket events
 * - Automatic cache invalidation on socket events
 * - Real-time updates across multiple clients
 */
type GetAllUsersQuery = MobxQuery<UserDto[], Error, UserDto[], UserDto[], any>
type GetUserQuery = MobxQuery<
    UserDto | undefined, 
    Error, 
    UserDto | undefined, 
    UserDto | undefined, 
    any
>

class UsersEntityWebSocket {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getAllUsersQuery: GetAllUsersQuery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getUserQuery: GetUserQuery
    @observable createUserMutation: MobxMutation<UserDto, Error, Omit<UserDto, 'id'>>
    @observable updateUserMutation: MobxMutation<UserDto, Error, { id: UserId; updates: Partial<Omit<UserDto, 'id'>> }>
    @observable deleteUserMutation: MobxMutation<{ id: UserId }, Error, UserId>

    private unsubscribeCreated?: () => void
    private unsubscribeUpdated?: () => void
    private unsubscribeDeleted?: () => void

    constructor() {
        makeObservable(this)

        // Query: Get all users
        this.getAllUsersQuery = new MobxQuery(() => ({
            queryKey: ['users', 'websocket'] as const,
            queryFn: this.getAllUsersFn,
            staleTime: 1000 * 60 * 5, // 5 minutes
        }))

        // Query: Get user by ID (disabled by default, use refetch with id)
        this.getUserQuery = new MobxQuery(() => ({
            queryKey: ['user', 'websocket'] as const,
            queryFn: async (): Promise<UserDto | undefined> => undefined,
            enabled: false,
        }))

        // Mutation: Create user
        this.createUserMutation = new MobxMutation(() => ({
            mutationFn: this.createUserFn,
            onSuccess: (newUser) => {
                // Update cache with new user
                queryClient.setQueryData<UserDto[]>(
                    ['users', 'websocket'] as const,
                    (old = []) => [...old, newUser]
                )
                console.log('✓ User created via WebSocket:', newUser.id)
            },
        }))

        // Mutation: Update user
        this.updateUserMutation = new MobxMutation(() => ({
            mutationFn: this.updateUserFn,
            onSuccess: (updatedUser) => {
                // Update cache with updated user
                queryClient.setQueryData<UserDto[]>(
                    ['users', 'websocket'] as const,
                    (old = []) =>
                        old.map((user) =>
                            user.id === updatedUser.id ? updatedUser : user
                        )
                )
                console.log('✓ User updated via WebSocket:', updatedUser.id)
            },
        }))

        // Mutation: Delete user
        this.deleteUserMutation = new MobxMutation(() => ({
            mutationFn: this.deleteUserFn,
            onSuccess: (data) => {
                // Remove user from cache
                queryClient.setQueryData<UserDto[]>(
                    ['users', 'websocket'] as const,
                    (old = []) => old.filter((user) => user.id !== data.id)
                )
                console.log('✓ User deleted via WebSocket:', data.id)
            },
        }))

        // Subscribe to real-time events
        this.subscribeToEvents()
    }

    /**
     * Subscribes to WebSocket events for automatic cache invalidation.
     * 
     * **Case 2: Real-time synchronization**
     * When ANY client (HTTP or WebSocket) modifies data,
     * all WebSocket clients receive events and update their cache.
     */
    private subscribeToEvents() {
        // Listen to user created event
        this.unsubscribeCreated = webSocketApi.on('users:created', () => {
            console.log('🔔 WebSocket event: users:created')
            queryClient.invalidateQueries({ queryKey: ['users', 'websocket'] })
        })

        // Listen to user updated event
        this.unsubscribeUpdated = webSocketApi.on<{ id: UserId }>(
            'users:updated',
            ({ id }) => {
                console.log(`🔔 WebSocket event: users:updated (${id})`)
                queryClient.invalidateQueries({ 
                    queryKey: ['users', 'websocket'],
                })
            }
        )

        // Listen to user deleted event
        this.unsubscribeDeleted = webSocketApi.on<{ id: UserId }>(
            'users:deleted',
            ({ id }) => {
                console.log(`🔔 WebSocket event: users:deleted (${id})`)
                queryClient.invalidateQueries({ 
                    queryKey: ['users', 'websocket'],
                })
            }
        )
    }

    /**
     * Unsubscribes from WebSocket events.
     * Call this when cleaning up the store.
     */
    unsubscribeFromEvents() {
        this.unsubscribeCreated?.()
        this.unsubscribeUpdated?.()
        this.unsubscribeDeleted?.()
    }

    /**
     * Fetches all users via WebSocket.
     */
    private getAllUsersFn = async (): Promise<UserDto[]> => {
        console.log('→ WebSocket: Fetching all users')
        const response = await webSocketApi.emit<ApiResponse<UserDto[]>>(
            'users:getAll'
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Fetches single user by ID via WebSocket.
     */
    private getUserFn = async (id: UserId): Promise<UserDto | undefined> => {
        console.log(`→ WebSocket: Fetching user ${id}`)
        const response = await webSocketApi.emit<ApiResponse<UserDto>>(
            'users:getById',
            { id }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Creates a new user via WebSocket.
     */
    private createUserFn = async (data: Omit<UserDto, 'id'>): Promise<UserDto> => {
        console.log('→ WebSocket: Creating user', data)
        const response = await webSocketApi.emit<ApiResponse<UserDto>>(
            'users:create',
            data
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Updates an existing user via WebSocket.
     */
    private updateUserFn = async ({
        id,
        updates,
    }: {
        id: UserId
        updates: Partial<Omit<UserDto, 'id'>>
    }): Promise<UserDto> => {
        console.log(`→ WebSocket: Updating user ${id}`, updates)
        const response = await webSocketApi.emit<ApiResponse<UserDto>>(
            'users:update',
            { id, ...updates }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Deletes a user via WebSocket.
     */
    private deleteUserFn = async (id: UserId): Promise<{ id: UserId }> => {
        console.log(`→ WebSocket: Deleting user ${id}`)
        const response = await webSocketApi.emit<ApiResponse<{ id: UserId }>>(
            'users:delete',
            { id }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }
}

export const usersEntityWebSocket = new UsersEntityWebSocket()
