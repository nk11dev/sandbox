import { makeObservable, observable } from 'mobx'

import { ApiResponse, GroupDto, GroupId } from '@/common'
import { MobxMutation, MobxQuery, queryClient, webSocketApi } from '@/services'

/**
 * Entity store for Groups with WebSocket transport.
 * Manages data fetching and mutations for group entities via Socket.io.
 * 
 * **Case 2: MobX + TanStack Query + WebSocket Integration**
 * This class demonstrates:
 * - Using MobxQuery with WebSocket as transport
 * - Using MobxMutation with WebSocket events
 * - Automatic cache invalidation on socket events (Case 6)
 * - Real-time updates across multiple clients
 */
type GetAllGroupsQuery = MobxQuery<
    GroupDto[], 
    Error, 
    GroupDto[], 
    GroupDto[], 
    readonly ['groups', 'websocket']
>
type GetGroupQuery = MobxQuery<
    GroupDto | undefined, 
    Error, 
    GroupDto | undefined, 
    GroupDto | undefined, 
    readonly ['group', 'websocket']
>

class GroupsEntityWebSocket {
    @observable getAllGroupsQuery: GetAllGroupsQuery
    @observable getGroupQuery: GetGroupQuery
    @observable createGroupMutation: MobxMutation<GroupDto, Error, Omit<GroupDto, 'id'>>
    @observable updateGroupMutation: MobxMutation<GroupDto, Error, { id: GroupId; updates: Partial<Omit<GroupDto, 'id'>> }>
    @observable deleteGroupMutation: MobxMutation<{ id: GroupId }, Error, GroupId>

    private unsubscribeCreated?: () => void
    private unsubscribeUpdated?: () => void
    private unsubscribeDeleted?: () => void

    constructor() {
        makeObservable(this)

        // Query: Get all groups
        this.getAllGroupsQuery = new MobxQuery(() => ({
            queryKey: ['groups', 'websocket'] as const,
            queryFn: this.getAllGroupsFn,
            staleTime: 1000 * 60 * 5, // 5 minutes
        }))

        // Query: Get group by ID (disabled by default, use refetch with id)
        this.getGroupQuery = new MobxQuery(() => ({
            queryKey: ['group', 'websocket'] as const,
            queryFn: async (): Promise<GroupDto | undefined> => undefined,
            enabled: false,
        }))

        // Mutation: Create group
        this.createGroupMutation = new MobxMutation(() => ({
            mutationFn: this.createGroupFn,
            onSuccess: (newGroup) => {
                /**
                 * **Case 5: Update cache without refetch**
                 */
                queryClient.setQueryData<GroupDto[]>(
                    ['groups', 'websocket'] as const,
                    (old = []) => [...old, newGroup]
                )
                console.log('✓ Group created via WebSocket:', newGroup.id)

                /**
                 * **Case 6: Invalidate related queries**
                 */
                queryClient.invalidateQueries({ queryKey: ['access'] })
            },
        }))

        // Mutation: Update group
        this.updateGroupMutation = new MobxMutation(() => ({
            mutationFn: this.updateGroupFn,
            onSuccess: (updatedGroup) => {
                /**
                 * **Case 5: Cache manipulation**
                 */
                queryClient.setQueryData<GroupDto[]>(
                    ['groups', 'websocket'] as const,
                    (old = []) =>
                        old.map((group) =>
                            group.id === updatedGroup.id ? updatedGroup : group
                        )
                )
                console.log('✓ Group updated via WebSocket:', updatedGroup.id)

                /**
                 * **Case 6: Invalidate related queries**
                 */
                queryClient.invalidateQueries({ queryKey: ['access'] })
            },
        }))

        // Mutation: Delete group
        this.deleteGroupMutation = new MobxMutation(() => ({
            mutationFn: this.deleteGroupFn,
            onSuccess: (data) => {
                /**
                 * **Case 5: Remove from cache**
                 */
                queryClient.setQueryData<GroupDto[]>(
                    ['groups', 'websocket'] as const,
                    (old = []) => old.filter((group) => group.id !== data.id)
                )
                console.log('✓ Group deleted via WebSocket:', data.id)

                /**
                 * **Case 6: Invalidate related queries**
                 */
                queryClient.invalidateQueries({ queryKey: ['access'] })
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
        // Listen to group created event
        this.unsubscribeCreated = webSocketApi.on('groups:created', () => {
            console.log('🔔 WebSocket event: groups:created')
            queryClient.invalidateQueries({ queryKey: ['groups', 'websocket'] })
            // Also invalidate access since new group affects matrix
            queryClient.invalidateQueries({ queryKey: ['access'] })
        })

        // Listen to group updated event
        this.unsubscribeUpdated = webSocketApi.on<{ id: GroupId }>(
            'groups:updated',
            ({ id }) => {
                console.log(`🔔 WebSocket event: groups:updated (${id})`)
                queryClient.invalidateQueries({ 
                    queryKey: ['groups', 'websocket'],
                })
                // Invalidate access that might reference this group
                queryClient.invalidateQueries({ queryKey: ['access'] })
            }
        )

        // Listen to group deleted event
        this.unsubscribeDeleted = webSocketApi.on<{ id: GroupId }>(
            'groups:deleted',
            ({ id }) => {
                console.log(`🔔 WebSocket event: groups:deleted (${id})`)
                queryClient.invalidateQueries({ 
                    queryKey: ['groups', 'websocket'],
                })
                // Invalidate access since group was removed
                queryClient.invalidateQueries({ queryKey: ['access'] })
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
     * Fetches all groups via WebSocket.
     */
    private getAllGroupsFn = async (): Promise<GroupDto[]> => {
        console.log('→ WebSocket: Fetching all groups')
        const response = await webSocketApi.emit<ApiResponse<GroupDto[]>>(
            'groups:getAll'
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Fetches single group by ID via WebSocket.
     * 
     * **Case 5: Cache reading optimization**
     */
    getGroupById = async (id: GroupId): Promise<GroupDto | undefined> => {
        console.log(`→ WebSocket: Fetching group ${id}`)
        
        // Try to get from cache first (Case 5)
        const cachedGroups = queryClient.getQueryData<GroupDto[]>(['groups', 'websocket'])
        const cachedGroup = cachedGroups?.find((g) => g.id === id)
        
        if (cachedGroup) {
            console.log(`  ✓ Found in cache: ${id}`)
            return cachedGroup
        }
        
        // Fetch from server if not in cache
        const response = await webSocketApi.emit<ApiResponse<GroupDto>>(
            'groups:getById',
            { id }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Creates a new group via WebSocket.
     */
    private createGroupFn = async (data: Omit<GroupDto, 'id'>): Promise<GroupDto> => {
        console.log('→ WebSocket: Creating group', data)
        const response = await webSocketApi.emit<ApiResponse<GroupDto>>(
            'groups:create',
            data
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Updates an existing group via WebSocket.
     */
    private updateGroupFn = async ({
        id,
        updates,
    }: {
        id: GroupId
        updates: Partial<Omit<GroupDto, 'id'>>
    }): Promise<GroupDto> => {
        console.log(`→ WebSocket: Updating group ${id}`, updates)
        const response = await webSocketApi.emit<ApiResponse<GroupDto>>(
            'groups:update',
            { id, ...updates }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Deletes a group via WebSocket.
     */
    private deleteGroupFn = async (id: GroupId): Promise<{ id: GroupId }> => {
        console.log(`→ WebSocket: Deleting group ${id}`)
        const response = await webSocketApi.emit<ApiResponse<{ id: GroupId }>>(
            'groups:delete',
            { id }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }
}

export const groupsEntityWebSocket = new GroupsEntityWebSocket()
