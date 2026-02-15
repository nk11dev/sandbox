import { action, computed, makeObservable, observable } from 'mobx'

import { RoleDto, RoleId } from '@/common'
import { rolesEntityHttp } from '@/stores/entities/RolesEntityHttp'

/**
 * State store for Roles List page with HTTP transport.
 * Manages UI state and business logic for role list operations.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * This class demonstrates:
 * - Using Entity store as data source
 * - Managing UI state (modals, forms, selected items)
 * - Exposing reactive computed properties to components
 * - Handling user interactions with actions
 */
export class RolesListStateHttp {
    @observable isModalOpen = false
    @observable editingRole: RoleDto | null = null
    @observable formData: { name: string } = {
        name: '',
    }

    constructor() {
        makeObservable(this)
    }

    /**
     * Gets all roles from entity store.
     * Component will re-render when this data changes.
     */
    @computed get roles(): RoleDto[] {
        return rolesEntityHttp.getAllRolesQuery.data || []
    }

    /**
     * Checks if data is loading.
     */
    @computed get isLoading(): boolean {
        return rolesEntityHttp.getAllRolesQuery.isLoading
    }

    /**
     * Checks if data is being fetched.
     */
    @computed get isFetching(): boolean {
        return rolesEntityHttp.getAllRolesQuery.isFetching
    }

    /**
     * Gets error if query failed.
     */
    @computed get error(): Error | null {
        return rolesEntityHttp.getAllRolesQuery.error
    }

    /**
     * Checks if mutation is pending.
     */
    @computed get isMutating(): boolean {
        return (
            rolesEntityHttp.createRoleMutation.isPending ||
            rolesEntityHttp.updateRoleMutation.isPending ||
            rolesEntityHttp.deleteRoleMutation.isPending
        )
    }

    /**
     * Opens modal for creating new role.
     */
    @action openCreateModal() {
        this.editingRole = null
        this.formData = { name: '' }
        this.isModalOpen = true
    }

    /**
     * Opens modal for editing existing role.
     */
    @action openEditModal(role: RoleDto) {
        this.editingRole = role
        this.formData = { name: role.name }
        this.isModalOpen = true
    }

    /**
     * Closes the modal and resets form.
     */
    @action closeModal() {
        this.isModalOpen = false
        this.editingRole = null
        this.formData = { name: '' }
    }

    /**
     * Updates form field value.
     */
    @action updateFormField(field: 'name', value: string) {
        this.formData[field] = value
    }

    /**
     * Submits the form (create or update based on editingRole).
     */
    @action async submitForm() {
        try {
            if (this.editingRole) {
                await this.updateRole(this.editingRole.id, this.formData)
            } else {
                await this.createRole(this.formData)
            }
            this.closeModal()
        } catch (error) {
            console.error('Form submission error:', error)
        }
    }

    /**
     * Creates a new role.
     * 
     * **Case 4: Mutation handling**
     * Demonstrates how mutations work with cache updates.
     */
    @action async createRole(data: { name: string }) {
        await rolesEntityHttp.createRoleMutation.mutate(data)
    }

    /**
     * Updates an existing role.
     * 
     * **Case 4: Mutation handling**
     * Demonstrates cache update after mutation.
     */
    @action async updateRole(
        id: RoleId,
        updates: Partial<Omit<RoleDto, 'id'>>
    ) {
        await rolesEntityHttp.updateRoleMutation.mutate({ id, updates })
    }

    /**
     * Deletes a role.
     * 
     * **Case 4: Mutation handling**
     * Demonstrates cache removal after mutation.
     */
    @action async deleteRole(id: RoleId) {
        if (confirm('Are you sure you want to delete this role?')) {
            await rolesEntityHttp.deleteRoleMutation.mutate(id)
        }
    }

    /**
     * Manually refetches roles list.
     */
    @action refetch() {
        rolesEntityHttp.getAllRolesQuery.refetch()
    }
}
