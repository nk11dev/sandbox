import { action, computed, makeObservable, observable } from 'mobx'

import { UserDto, UserId } from '@/common'
import { usersEntityHttp } from '@/stores/entities/UsersEntityHttp'

/**
 * State store for Users List page with HTTP transport.
 * Manages UI state and business logic for user list operations.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * This class demonstrates:
 * - Using Entity store as data source
 * - Managing UI state (modals, forms, selected items)
 * - Exposing reactive computed properties to components
 * - Handling user interactions with actions
 */
export class UsersListStateHttp {
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
        return usersEntityHttp.getAllUsersQuery.data || []
    }

    /**
     * Checks if data is loading.
     */
    @computed get isLoading(): boolean {
        return usersEntityHttp.getAllUsersQuery.isLoading
    }

    /**
     * Checks if data is being fetched.
     */
    @computed get isFetching(): boolean {
        return usersEntityHttp.getAllUsersQuery.isFetching
    }

    /**
     * Gets error if query failed.
     */
    @computed get error(): Error | null {
        return usersEntityHttp.getAllUsersQuery.error
    }

    /**
     * Checks if mutation is pending.
     */
    @computed get isMutating(): boolean {
        return (
            usersEntityHttp.createUserMutation.isPending ||
            usersEntityHttp.updateUserMutation.isPending ||
            usersEntityHttp.deleteUserMutation.isPending
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
     * 
     * **Case 4: Mutation handling**
     * Demonstrates how mutations work with cache updates.
     */
    @action async createUser(data: { name: string; email: string }) {
        await usersEntityHttp.createUserMutation.mutate(data)
    }

    /**
     * Updates an existing user.
     * 
     * **Case 4: Mutation handling**
     * Demonstrates cache update after mutation.
     */
    @action async updateUser(
        id: UserId,
        updates: Partial<Omit<UserDto, 'id'>>
    ) {
        await usersEntityHttp.updateUserMutation.mutate({ id, updates })
    }

    /**
     * Deletes a user.
     * 
     * **Case 4: Mutation handling**
     * Demonstrates cache removal after mutation.
     */
    @action async deleteUser(id: UserId) {
        if (confirm('Are you sure you want to delete this user?')) {
            await usersEntityHttp.deleteUserMutation.mutate(id)
        }
    }

    /**
     * Manually refetches users list.
     */
    @action refetch() {
        usersEntityHttp.getAllUsersQuery.refetch()
    }
}
