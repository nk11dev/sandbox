import { makeObservable, observable } from 'mobx'

import { RoleDto, RoleId, ApiResponse } from '@/common'
import { httpApi, MobxMutation, MobxQuery, queryClient } from '@/services'

/**
 * Entity store for Roles with HTTP transport.
 * Manages data fetching and mutations for role entities via REST API.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * This class demonstrates:
 * - Using MobxQuery for reactive data fetching
 * - Using MobxMutation for reactive mutations
 * - Automatic cache updates after mutations (Case 5)
 * - Cache invalidation for related queries (Case 6)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GetAllRolesQuery = MobxQuery<RoleDto[], Error, RoleDto[], RoleDto[], any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GetRoleQuery = MobxQuery<
    RoleDto | undefined, 
    Error, 
    RoleDto | undefined, 
    RoleDto | undefined, 
    any
>

class RolesEntityHttp {
    @observable getAllRolesQuery: GetAllRolesQuery
    @observable getRoleQuery: GetRoleQuery
    @observable createRoleMutation: MobxMutation<RoleDto, Error, Omit<RoleDto, 'id'>>
    @observable updateRoleMutation: MobxMutation<RoleDto, Error, { id: RoleId; updates: Partial<Omit<RoleDto, 'id'>> }>
    @observable deleteRoleMutation: MobxMutation<{ id: RoleId }, Error, RoleId>

    constructor() {
        makeObservable(this)

        // Query: Get all roles
        this.getAllRolesQuery = new MobxQuery(() => ({
            queryKey: ['roles', 'http'] as const,
            queryFn: this.getAllRolesFn,
            staleTime: 1000 * 60 * 5, // 5 minutes
        }))

        // Query: Get role by ID (disabled by default, use refetch with id)
        this.getRoleQuery = new MobxQuery(() => ({
            queryKey: ['role', 'http'] as const,
            queryFn: async (): Promise<RoleDto | undefined> => undefined,
            enabled: false,
        }))

        // Mutation: Create role
        this.createRoleMutation = new MobxMutation(() => ({
            mutationFn: this.createRoleFn,
            onSuccess: (newRole) => {
                /**
                 * **Case 5: Reading from cache to update without new requests**
                 * We update the cache directly with setQueryData,
                 * so components re-render without additional API calls.
                 */
                queryClient.setQueryData<RoleDto[]>(
                    ['roles', 'http'] as const,
                    (old = []) => [...old, newRole]
                )
                console.log('✓ Role created via HTTP:', newRole.id)
            },
        }))

        // Mutation: Update role
        this.updateRoleMutation = new MobxMutation(() => ({
            mutationFn: this.updateRoleFn,
            onSuccess: (updatedRole) => {
                /**
                 * **Case 5: Cache manipulation without refetch**
                 * Update cache immediately for instant UI updates.
                 */
                queryClient.setQueryData<RoleDto[]>(
                    ['roles', 'http'] as const,
                    (old = []) =>
                        old.map((role) =>
                            role.id === updatedRole.id ? updatedRole : role
                        )
                )
                console.log('✓ Role updated via HTTP:', updatedRole.id)

                /**
                 * **Case 6: Cache invalidation for related queries**
                 * When a role changes, groups that use this role might need to update.
                 */
                queryClient.invalidateQueries({ queryKey: ['groups'] })
            },
        }))

        // Mutation: Delete role
        this.deleteRoleMutation = new MobxMutation(() => ({
            mutationFn: this.deleteRoleFn,
            onSuccess: (data) => {
                /**
                 * **Case 5: Remove from cache without refetch**
                 */
                queryClient.setQueryData<RoleDto[]>(
                    ['roles', 'http'] as const,
                    (old = []) => old.filter((role) => role.id !== data.id)
                )
                console.log('✓ Role deleted via HTTP:', data.id)

                /**
                 * **Case 6: Invalidate related queries**
                 * Groups using this role need to be refreshed.
                 */
                queryClient.invalidateQueries({ queryKey: ['groups'] })
            },
        }))
    }

    /**
     * Fetches all roles from HTTP API.
     */
    private getAllRolesFn = async (): Promise<RoleDto[]> => {
        console.log('→ HTTP: Fetching all roles')
        const response = await httpApi.get<ApiResponse<RoleDto[]>>('/roles')
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Fetches single role by ID from HTTP API.
     */
    private getRoleFn = async (id: RoleId): Promise<RoleDto | undefined> => {
        console.log(`→ HTTP: Fetching role ${id}`)
        const response = await httpApi.get<ApiResponse<RoleDto>>(`/roles/${id}`)
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Creates a new role via HTTP API.
     */
    private createRoleFn = async (data: Omit<RoleDto, 'id'>): Promise<RoleDto> => {
        console.log('→ HTTP: Creating role', data)
        const response = await httpApi.post<ApiResponse<RoleDto>>('/roles', data)
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Updates an existing role via HTTP API.
     */
    private updateRoleFn = async ({
        id,
        updates,
    }: {
        id: RoleId
        updates: Partial<Omit<RoleDto, 'id'>>
    }): Promise<RoleDto> => {
        console.log(`→ HTTP: Updating role ${id}`, updates)
        const response = await httpApi.put<ApiResponse<RoleDto>>(
            `/roles/${id}`,
            updates
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Deletes a role via HTTP API.
     */
    private deleteRoleFn = async (id: RoleId): Promise<{ id: RoleId }> => {
        console.log(`→ HTTP: Deleting role ${id}`)
        const response = await httpApi.delete<ApiResponse<{ id: RoleId }>>(
            `/roles/${id}`
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }
}

export const rolesEntityHttp = new RolesEntityHttp()
