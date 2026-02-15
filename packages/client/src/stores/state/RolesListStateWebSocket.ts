import { action, computed, makeObservable, observable } from 'mobx'

import { RoleDto, RoleId } from '@/common'
import { rolesEntityWebSocket } from '@/stores/entities/RolesEntityWebSocket'

/**
 * State store for Roles List page with WebSocket transport.
 * Manages UI state and business logic for role list operations.
 * 
 * **Case 2: MobX + TanStack Query + WebSocket Integration**
 * This class demonstrates:
 * - Using WebSocket Entity store as data source
 * - Same interface as HTTP version (transport-agnostic)
 * - Real-time updates across multiple clients
 */
export class RolesListStateWebSocket {
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
        return rolesEntityWebSocket.getAllRolesQuery.data || []
    }

    /**
     * Checks if data is loading.
     */
    @computed get isLoading(): boolean {
        return rolesEntityWebSocket.getAllRolesQuery.isLoading
    }

    /**
     * Checks if data is being fetched.
     */
    @computed get isFetching(): boolean {
        return rolesEntityWebSocket.getAllRolesQuery.isFetching
    }

    /**
     * Gets error if query failed.
     */
    @computed get error(): Error | null {
        return rolesEntityWebSocket.getAllRolesQuery.error
    }

    /**
     * Checks if mutation is pending.
     */
    @computed get isMutating(): boolean {
        return (
            rolesEntityWebSocket.createRoleMutation.isPending ||
            rolesEntityWebSocket.updateRoleMutation.isPending ||
            rolesEntityWebSocket.deleteRoleMutation.isPending
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
     */
    @action async createRole(data: { name: string }) {
        await rolesEntityWebSocket.createRoleMutation.mutate(data)
    }

    /**
     * Updates an existing role.
     */
    @action async updateRole(
        id: RoleId,
        updates: Partial<Omit<RoleDto, 'id'>>
    ) {
        await rolesEntityWebSocket.updateRoleMutation.mutate({ id, updates })
    }

    /**
     * Deletes a role.
     */
    @action async deleteRole(id: RoleId) {
        if (confirm('Are you sure you want to delete this role?')) {
            await rolesEntityWebSocket.deleteRoleMutation.mutate(id)
        }
    }

    /**
     * Manually refetches roles list.
     */
    @action refetch() {
        rolesEntityWebSocket.getAllRolesQuery.refetch()
    }
}
