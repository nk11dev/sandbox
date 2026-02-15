import { makeObservable, observable } from 'mobx'

import { ApiResponse, RoleDto, RoleId } from '@/common'
import { MobxMutation, MobxQuery, queryClient, webSocketApi } from '@/services'

/**
 * Entity store for Roles with WebSocket transport.
 * Manages data fetching and mutations for role entities via Socket.io.
 * 
 * **Case 2: MobX + TanStack Query + WebSocket Integration**
 * This class demonstrates:
 * - Using MobxQuery with WebSocket as transport
 * - Using MobxMutation with WebSocket events
 * - Automatic cache invalidation on socket events (Case 6)
 * - Real-time updates across multiple clients
 */
type GetAllRolesQuery = MobxQuery<RoleDto[], Error, RoleDto[], RoleDto[], any>
type GetRoleQuery = MobxQuery<
    RoleDto | undefined, 
    Error, 
    RoleDto | undefined, 
    RoleDto | undefined, 
    any
>

class RolesEntityWebSocket {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getAllRolesQuery: GetAllRolesQuery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getRoleQuery: GetRoleQuery
    @observable createRoleMutation: MobxMutation<RoleDto, Error, Omit<RoleDto, 'id'>>
    @observable updateRoleMutation: MobxMutation<RoleDto, Error, { id: RoleId; updates: Partial<Omit<RoleDto, 'id'>> }>
    @observable deleteRoleMutation: MobxMutation<{ id: RoleId }, Error, RoleId>

    private unsubscribeCreated?: () => void
    private unsubscribeUpdated?: () => void
    private unsubscribeDeleted?: () => void

    constructor() {
        makeObservable(this)

        // Query: Get all roles
        this.getAllRolesQuery = new MobxQuery(() => ({
            queryKey: ['roles', 'websocket'] as const,
            queryFn: this.getAllRolesFn,
            staleTime: 1000 * 60 * 5, // 5 minutes
        }))

        // Query: Get role by ID (disabled by default, use refetch with id)
        this.getRoleQuery = new MobxQuery(() => ({
            queryKey: ['role', 'websocket'] as const,
            queryFn: async (): Promise<RoleDto | undefined> => undefined,
            enabled: false,
        }))

        // Mutation: Create role
        this.createRoleMutation = new MobxMutation(() => ({
            mutationFn: this.createRoleFn,
            onSuccess: (newRole) => {
                /**
                 * **Case 5: Update cache without refetch**
                 */
                queryClient.setQueryData<RoleDto[]>(
                    ['roles', 'websocket'] as const,
                    (old = []) => [...old, newRole]
                )
                console.log('✓ Role created via WebSocket:', newRole.id)
            },
        }))

        // Mutation: Update role
        this.updateRoleMutation = new MobxMutation(() => ({
            mutationFn: this.updateRoleFn,
            onSuccess: (updatedRole) => {
                /**
                 * **Case 5: Cache manipulation**
                 */
                queryClient.setQueryData<RoleDto[]>(
                    ['roles', 'websocket'] as const,
                    (old = []) =>
                        old.map((role) =>
                            role.id === updatedRole.id ? updatedRole : role
                        )
                )
                console.log('✓ Role updated via WebSocket:', updatedRole.id)

                /**
                 * **Case 6: Invalidate related queries**
                 */
                queryClient.invalidateQueries({ queryKey: ['groups'] })
            },
        }))

        // Mutation: Delete role
        this.deleteRoleMutation = new MobxMutation(() => ({
            mutationFn: this.deleteRoleFn,
            onSuccess: (data) => {
                /**
                 * **Case 5: Remove from cache**
                 */
                queryClient.setQueryData<RoleDto[]>(
                    ['roles', 'websocket'] as const,
                    (old = []) => old.filter((role) => role.id !== data.id)
                )
                console.log('✓ Role deleted via WebSocket:', data.id)

                /**
                 * **Case 6: Invalidate related queries**
                 */
                queryClient.invalidateQueries({ queryKey: ['groups'] })
            },
        }))

        // Subscribe to real-time events
        this.subscribeToEvents()
    }

    /**
     * Subscribes to WebSocket events for automatic cache invalidation.
     * 
     * **Case 2 & 6: Real-time synchronization + Cache invalidation**
     * When ANY client (HTTP or WebSocket) modifies data,
     * all WebSocket clients receive events and invalidate their cache,
     * triggering automatic refetch.
     */
    private subscribeToEvents() {
        // Listen to role created event
        this.unsubscribeCreated = webSocketApi.on('roles:created', () => {
            console.log('🔔 WebSocket event: roles:created')
            queryClient.invalidateQueries({ queryKey: ['roles', 'websocket'] })
            // Also invalidate groups since they depend on roles
            queryClient.invalidateQueries({ queryKey: ['groups'] })
        })

        // Listen to role updated event
        this.unsubscribeUpdated = webSocketApi.on<{ id: RoleId }>(
            'roles:updated',
            ({ id }) => {
                console.log(`🔔 WebSocket event: roles:updated (${id})`)
                queryClient.invalidateQueries({ 
                    queryKey: ['roles', 'websocket'],
                })
                // Invalidate groups that might use this role
                queryClient.invalidateQueries({ queryKey: ['groups'] })
            }
        )

        // Listen to role deleted event
        this.unsubscribeDeleted = webSocketApi.on<{ id: RoleId }>(
            'roles:deleted',
            ({ id }) => {
                console.log(`🔔 WebSocket event: roles:deleted (${id})`)
                queryClient.invalidateQueries({ 
                    queryKey: ['roles', 'websocket'],
                })
                // Invalidate groups since they might have used this role
                queryClient.invalidateQueries({ queryKey: ['groups'] })
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
     * Fetches all roles via WebSocket.
     */
    private getAllRolesFn = async (): Promise<RoleDto[]> => {
        console.log('→ WebSocket: Fetching all roles')
        const response = await webSocketApi.emit<ApiResponse<RoleDto[]>>(
            'roles:getAll'
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Fetches single role by ID via WebSocket.
     */
    private getRoleFn = async (id: RoleId): Promise<RoleDto | undefined> => {
        console.log(`→ WebSocket: Fetching role ${id}`)
        const response = await webSocketApi.emit<ApiResponse<RoleDto>>(
            'roles:getById',
            { id }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Creates a new role via WebSocket.
     */
    private createRoleFn = async (data: Omit<RoleDto, 'id'>): Promise<RoleDto> => {
        console.log('→ WebSocket: Creating role', data)
        const response = await webSocketApi.emit<ApiResponse<RoleDto>>(
            'roles:create',
            data
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Updates an existing role via WebSocket.
     */
    private updateRoleFn = async ({
        id,
        updates,
    }: {
        id: RoleId
        updates: Partial<Omit<RoleDto, 'id'>>
    }): Promise<RoleDto> => {
        console.log(`→ WebSocket: Updating role ${id}`, updates)
        const response = await webSocketApi.emit<ApiResponse<RoleDto>>(
            'roles:update',
            { id, ...updates }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Deletes a role via WebSocket.
     */
    private deleteRoleFn = async (id: RoleId): Promise<{ id: RoleId }> => {
        console.log(`→ WebSocket: Deleting role ${id}`)
        const response = await webSocketApi.emit<ApiResponse<{ id: RoleId }>>(
            'roles:delete',
            { id }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }
}

export const rolesEntityWebSocket = new RolesEntityWebSocket()
