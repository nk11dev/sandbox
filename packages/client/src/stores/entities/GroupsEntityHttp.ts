import { makeObservable, observable } from 'mobx'

import { GroupDto, GroupId, ApiResponse } from '@/common'
import { httpApi, MobxMutation, MobxQuery, queryClient } from '@/services'

/**
 * Entity store for Groups with HTTP transport.
 * Manages data fetching and mutations for group entities via REST API.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * This class demonstrates:
 * - Using MobxQuery for reactive data fetching
 * - Using MobxMutation for reactive mutations
 * - Cache updates after mutations (Case 5)
 * - Cache invalidation for related queries (Case 6)
 */
type GetAllGroupsQuery = MobxQuery<GroupDto[], Error, GroupDto[], GroupDto[], any>
type GetGroupQuery = MobxQuery<
    GroupDto | undefined, 
    Error, 
    GroupDto | undefined, 
    GroupDto | undefined, 
    any
>

class GroupsEntityHttp {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getAllGroupsQuery: GetAllGroupsQuery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getGroupQuery: GetGroupQuery
    @observable createGroupMutation: MobxMutation<GroupDto, Error, Omit<GroupDto, 'id'>>
    @observable updateGroupMutation: MobxMutation<GroupDto, Error, { id: GroupId; updates: Partial<Omit<GroupDto, 'id'>> }>
    @observable deleteGroupMutation: MobxMutation<{ id: GroupId }, Error, GroupId>

    constructor() {
        makeObservable(this)

        // Query: Get all groups
        this.getAllGroupsQuery = new MobxQuery(() => ({
            queryKey: ['groups', 'http'] as const,
            queryFn: this.getAllGroupsFn,
            staleTime: 1000 * 60 * 5, // 5 minutes
        }))

        // Query: Get group by ID (disabled by default, use refetch with id)
        this.getGroupQuery = new MobxQuery(() => ({
            queryKey: ['group', 'http'] as const,
            queryFn: async (): Promise<GroupDto | undefined> => undefined,
            enabled: false,
        }))

        // Mutation: Create group
        this.createGroupMutation = new MobxMutation(() => ({
            mutationFn: this.createGroupFn,
            onSuccess: (newGroup) => {
                /**
                 * **Case 5: Reading from cache to update without new requests**
                 */
                queryClient.setQueryData<GroupDto[]>(
                    ['groups', 'http'] as const,
                    (old = []) => [...old, newGroup]
                )
                console.log('✓ Group created via HTTP:', newGroup.id)

                /**
                 * **Case 6: Cache invalidation for related queries**
                 * When a group is created, access matrix needs to update.
                 */
                queryClient.invalidateQueries({ queryKey: ['access'] })
            },
        }))

        // Mutation: Update group
        this.updateGroupMutation = new MobxMutation(() => ({
            mutationFn: this.updateGroupFn,
            onSuccess: (updatedGroup) => {
                /**
                 * **Case 5: Cache manipulation without refetch**
                 */
                queryClient.setQueryData<GroupDto[]>(
                    ['groups', 'http'] as const,
                    (old = []) =>
                        old.map((group) =>
                            group.id === updatedGroup.id ? updatedGroup : group
                        )
                )
                console.log('✓ Group updated via HTTP:', updatedGroup.id)

                /**
                 * **Case 6: Invalidate access queries**
                 * Access matrix might need to reflect group changes.
                 */
                queryClient.invalidateQueries({ queryKey: ['access'] })
            },
        }))

        // Mutation: Delete group
        this.deleteGroupMutation = new MobxMutation(() => ({
            mutationFn: this.deleteGroupFn,
            onSuccess: (data) => {
                /**
                 * **Case 5: Remove from cache without refetch**
                 */
                queryClient.setQueryData<GroupDto[]>(
                    ['groups', 'http'] as const,
                    (old = []) => old.filter((group) => group.id !== data.id)
                )
                console.log('✓ Group deleted via HTTP:', data.id)

                /**
                 * **Case 6: Invalidate related queries**
                 * Access matrix needs to remove this group.
                 */
                queryClient.invalidateQueries({ queryKey: ['access'] })
            },
        }))
    }

    /**
     * Fetches all groups from HTTP API.
     */
    private getAllGroupsFn = async (): Promise<GroupDto[]> => {
        console.log('→ HTTP: Fetching all groups')
        const response = await httpApi.get<ApiResponse<GroupDto[]>>('/groups')
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Fetches single group by ID from HTTP API.
     * 
     * **Case 5: Cache reading optimization**
     * Before fetching, we could check if group exists in cache.
     */
    getGroupById = async (id: GroupId): Promise<GroupDto | undefined> => {
        console.log(`→ HTTP: Fetching group ${id}`)
        
        // Try to get from cache first (Case 5)
        const cachedGroups = queryClient.getQueryData<GroupDto[]>(['groups', 'http'])
        const cachedGroup = cachedGroups?.find((g) => g.id === id)
        
        if (cachedGroup) {
            console.log(`  ✓ Found in cache: ${id}`)
            return cachedGroup
        }
        
        // Fetch from server if not in cache
        const response = await httpApi.get<ApiResponse<GroupDto>>(`/groups/${id}`)
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Creates a new group via HTTP API.
     */
    private createGroupFn = async (data: Omit<GroupDto, 'id'>): Promise<GroupDto> => {
        console.log('→ HTTP: Creating group', data)
        const response = await httpApi.post<ApiResponse<GroupDto>>('/groups', data)
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Updates an existing group via HTTP API.
     */
    private updateGroupFn = async ({
        id,
        updates,
    }: {
        id: GroupId
        updates: Partial<Omit<GroupDto, 'id'>>
    }): Promise<GroupDto> => {
        console.log(`→ HTTP: Updating group ${id}`, updates)
        const response = await httpApi.put<ApiResponse<GroupDto>>(
            `/groups/${id}`,
            updates
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Deletes a group via HTTP API.
     */
    private deleteGroupFn = async (id: GroupId): Promise<{ id: GroupId }> => {
        console.log(`→ HTTP: Deleting group ${id}`)
        const response = await httpApi.delete<ApiResponse<{ id: GroupId }>>(
            `/groups/${id}`
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }
}

export const groupsEntityHttp = new GroupsEntityHttp()
