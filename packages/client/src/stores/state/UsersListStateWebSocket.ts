import { action, computed, makeObservable, observable } from 'mobx'

import { UserDto, UserId } from '@/common'
import { usersEntityWebSocket } from '@/stores/entities/UsersEntityWebSocket'

/**
 * State store for Users List page with WebSocket transport.
 * Manages UI state and business logic for user list operations.
 * 
 * **Case 2: MobX + TanStack Query + WebSocket Integration**
 * This class demonstrates:
 * - Using WebSocket Entity store as data source
 * - Same interface as HTTP version (transportagnostic)
 * - Real-time updates across multiple clients
 */
export class UsersListStateWebSocket {
    @observable isModalOpen = false
    @observable editingUser: UserDto | null = null
    @observable formData: { name: string; email: string } = {
        name: '',
        email: '',
    }

    constructor() {
        makeObservable(this)
    }

    /**
     * Gets all users from entity store.
     * Component will re-render when this data changes.
     */
    @computed get users(): UserDto[] {
        return usersEntityWebSocket.getAllUsersQuery.data || []
    }

    /**
     * Checks if data is loading.
     */
    @computed get isLoading(): boolean {
        return usersEntityWebSocket.getAllUsersQuery.isLoading
    }

    /**
     * Checks if data is being fetched.
     */
    @computed get isFetching(): boolean {
        return usersEntityWebSocket.getAllUsersQuery.isFetching
    }

    /**
     * Gets error if query failed.
     */
    @computed get error(): Error | null {
        return usersEntityWebSocket.getAllUsersQuery.error
    }

    /**
     * Checks if mutation is pending.
     */
    @computed get isMutating(): boolean {
        return (
            usersEntityWebSocket.createUserMutation.isPending ||
            usersEntityWebSocket.updateUserMutation.isPending ||
            usersEntityWebSocket.deleteUserMutation.isPending
        )
    }

    /**
     * Opens modal for creating new user.
     */
    @action openCreateModal() {
        this.editingUser = null
        this.formData = { name: '', email: '' }
        this.isModalOpen = true
    }

    /**
     * Opens modal for editing existing user.
     */
    @action openEditModal(user: UserDto) {
        this.editingUser = user
        this.formData = { name: user.name, email: user.email }
        this.isModalOpen = true
    }

    /**
     * Closes the modal and resets form.
     */
    @action closeModal() {
        this.isModalOpen = false
        this.editingUser = null
        this.formData = { name: '', email: '' }
    }

    /**
     * Updates form field value.
     */
    @action updateFormField(field: 'name' | 'email', value: string) {
        this.formData[field] = value
    }

    /**
     * Submits the form (create or update based on editingUser).
     */
    @action async submitForm() {
        try {
            if (this.editingUser) {
                await this.updateUser(this.editingUser.id, this.formData)
            } else {
                await this.createUser(this.formData)
            }
            this.closeModal()
        } catch (error) {
            console.error('Form submission error:', error)
        }
    }

    /**
     * Creates a new user.
     */
    @action async createUser(data: { name: string; email: string }) {
        await usersEntityWebSocket.createUserMutation.mutate(data)
    }

    /**
     * Updates an existing user.
     */
    @action async updateUser(
        id: UserId,
        updates: Partial<Omit<UserDto, 'id'>>
    ) {
        await usersEntityWebSocket.updateUserMutation.mutate({ id, updates })
    }

    /**
     * Deletes a user.
     */
    @action async deleteUser(id: UserId) {
        if (confirm('Are you sure you want to delete this user?')) {
            await usersEntityWebSocket.deleteUserMutation.mutate(id)
        }
    }

    /**
     * Manually refetches users list.
     */
    @action refetch() {
        usersEntityWebSocket.getAllUsersQuery.refetch()
    }
}
