import { makeObservable, observable } from 'mobx'

import { UserDto, UserId, ApiResponse } from '@/common'
import { httpApi, MobxMutation, MobxQuery, queryClient } from '@/services'

/**
 * Entity store for Users with HTTP transport.
 * Manages data fetching and mutations for user entities via REST API.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * This class demonstrates:
 * - Using MobxQuery for reactive data fetching
 * - Using MobxMutation for reactive mutations
 * - Automatic cache invalidation after mutations
 * - TypeScript type safety throughout the chain
 */
type GetAllUsersQuery = MobxQuery<
    UserDto[], 
    Error, 
    UserDto[], 
    UserDto[], 
    readonly ['users', 'http']
>
type GetUserQuery = MobxQuery<
    UserDto | undefined, 
    Error, 
    UserDto | undefined, 
    UserDto | undefined, 
    readonly ['user', 'http']
>

class UsersEntityHttp {
    @observable getAllUsersQuery: GetAllUsersQuery
    @observable getUserQuery: GetUserQuery
    @observable createUserMutation: MobxMutation<UserDto, Error, Omit<UserDto, 'id'>>
    @observable updateUserMutation: MobxMutation<UserDto, Error, { id: UserId; updates: Partial<Omit<UserDto, 'id'>> }>
    @observable deleteUserMutation: MobxMutation<{ id: UserId }, Error, UserId>

    constructor() {
        makeObservable(this)

        // Query: Get all users
        this.getAllUsersQuery = new MobxQuery(() => ({
            queryKey: ['users', 'http'] as const,
            queryFn: this.getAllUsersFn,
            staleTime: 1000 * 60 * 5, // 5 minutes
        }))

        // Query: Get user by ID (disabled by default, use refetch with id)
        this.getUserQuery = new MobxQuery(() => ({
            queryKey: ['user', 'http'] as const,
            queryFn: async (): Promise<UserDto | undefined> => undefined,
            enabled: false, // Only fetch when explicitly called
        }))

        // Mutation: Create user
        this.createUserMutation = new MobxMutation(() => ({
            mutationFn: this.createUserFn,
            onSuccess: (newUser) => {
                // Update cache with new user (optimistic update alternative)
                queryClient.setQueryData<UserDto[]>(
                    ['users', 'http'] as const,
                    (old = []) => [...old, newUser]
                )
                console.log('✓ User created via HTTP:', newUser.id)
            },
        }))

        // Mutation: Update user
        this.updateUserMutation = new MobxMutation(() => ({
            mutationFn: this.updateUserFn,
            onSuccess: (updatedUser) => {
                // Update cache with updated user
                queryClient.setQueryData<UserDto[]>(
                    ['users', 'http'] as const,
                    (old = []) =>
                        old.map((user) =>
                            user.id === updatedUser.id ? updatedUser : user
                        )
                )
                console.log('✓ User updated via HTTP:', updatedUser.id)
            },
        }))

        // Mutation: Delete user
        this.deleteUserMutation = new MobxMutation(() => ({
            mutationFn: this.deleteUserFn,
            onSuccess: (data) => {
                // Remove user from cache
                queryClient.setQueryData<UserDto[]>(
                    ['users', 'http'] as const,
                    (old = []) => old.filter((user) => user.id !== data.id)
                )
                console.log('✓ User deleted via HTTP:', data.id)
            },
        }))
    }

    /**
     * Fetches all users from HTTP API.
     */
    private getAllUsersFn = async (): Promise<UserDto[]> => {
        console.log('→ HTTP: Fetching all users')
        const response = await httpApi.get<ApiResponse<UserDto[]>>('/users')
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Fetches single user by ID from HTTP API.
     */
    private getUserFn = async (id: UserId): Promise<UserDto | undefined> => {
        console.log(`→ HTTP: Fetching user ${id}`)
        const response = await httpApi.get<ApiResponse<UserDto>>(`/users/${id}`)
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Creates a new user via HTTP API.
     */
    private createUserFn = async (data: Omit<UserDto, 'id'>): Promise<UserDto> => {
        console.log('→ HTTP: Creating user', data)
        const response = await httpApi.post<ApiResponse<UserDto>>('/users', data)
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Updates an existing user via HTTP API.
     */
    private updateUserFn = async ({
        id,
        updates,
    }: {
        id: UserId
        updates: Partial<Omit<UserDto, 'id'>>
    }): Promise<UserDto> => {
        console.log(`→ HTTP: Updating user ${id}`, updates)
        const response = await httpApi.put<ApiResponse<UserDto>>(
            `/users/${id}`,
            updates
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Deletes a user via HTTP API.
     */
    private deleteUserFn = async (id: UserId): Promise<{ id: UserId }> => {
        console.log(`→ HTTP: Deleting user ${id}`)
        const response = await httpApi.delete<ApiResponse<{ id: UserId }>>(
            `/users/${id}`
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }
}

export const usersEntityHttp = new UsersEntityHttp()

// Export class for testing
export { UsersEntityHttp }
