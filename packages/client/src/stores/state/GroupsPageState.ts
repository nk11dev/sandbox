import { action, computed, makeObservable, observable } from 'mobx'

import { GroupDto, GroupId, UserDto, UserId, AccessDto } from '@/common'
import { accessEntityHttp } from '@/stores/entities/AccessEntityHttp'
import { groupsEntityHttp } from '@/stores/entities/GroupsEntityHttp'
import { usersEntityHttp } from '@/stores/entities/UsersEntityHttp'

/**
 * State store for Groups Page.
 * Manages both Groups Catalog and Groups Access Matrix.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * This class demonstrates:
 * - Using multiple Entity stores together
 * - Managing complex UI state (catalog + access matrix)
 * - Handling many-to-many relationships (users ↔ groups)
 * 
 * **Case 5 & 6: Cache reading and invalidation**
 * When groups are modified, access matrix automatically updates
 * thanks to cache invalidation in entity stores.
 */
export class GroupsPageState {
    // Groups Catalog state
    @observable isGroupModalOpen = false
    @observable editingGroup: GroupDto | null = null
    @observable groupFormData: { name: string; roles: number[]; description: string } = {
        name: '',
        roles: [],
        description: '',
    }

    // Access Matrix state
    @observable searchQuery = ''

    constructor() {
        makeObservable(this)
    }

    // ==================== Groups Catalog ====================

    /**
     * Gets all groups from entity store.
     */
    @computed get groups(): GroupDto[] {
        return groupsEntityHttp.getAllGroupsQuery.data || []
    }

    /**
     * Checks if groups are loading.
     */
    @computed get isGroupsLoading(): boolean {
        return groupsEntityHttp.getAllGroupsQuery.isLoading
    }

    /**
     * Checks if groups are being fetched.
     */
    @computed get isGroupsFetching(): boolean {
        return groupsEntityHttp.getAllGroupsQuery.isFetching
    }

    /**
     * Gets error if groups query failed.
     */
    @computed get groupsError(): Error | null {
        return groupsEntityHttp.getAllGroupsQuery.error
    }

    /**
     * Checks if group mutation is pending.
     */
    @computed get isGroupMutating(): boolean {
        return (
            groupsEntityHttp.createGroupMutation.isPending ||
            groupsEntityHttp.updateGroupMutation.isPending ||
            groupsEntityHttp.deleteGroupMutation.isPending
        )
    }

    /**
     * Opens modal for creating new group.
     */
    @action openCreateGroupModal() {
        this.editingGroup = null
        this.groupFormData = { name: '', roles: [], description: '' }
        this.isGroupModalOpen = true
    }

    /**
     * Opens modal for editing existing group.
     */
    @action openEditGroupModal(group: GroupDto) {
        this.editingGroup = group
        this.groupFormData = {
            name: group.name,
            roles: [...group.roles],
            description: group.description || '',
        }
        this.isGroupModalOpen = true
    }

    /**
     * Closes the group modal and resets form.
     */
    @action closeGroupModal() {
        this.isGroupModalOpen = false
        this.editingGroup = null
        this.groupFormData = { name: '', roles: [], description: '' }
    }

    /**
     * Updates group form field value.
     */
    @action updateGroupFormField(
        field: 'name' | 'roles' | 'description',
        value: string | number[]
    ) {
        (this.groupFormData as Record<string, unknown>)[field] = value
    }

    /**
     * Submits the group form (create or update).
     */
    @action async submitGroupForm() {
        try {
            if (this.editingGroup) {
                await this.updateGroup(this.editingGroup.id, this.groupFormData)
            } else {
                await this.createGroup(this.groupFormData)
            }
            this.closeGroupModal()
        } catch (error) {
            console.error('Group form submission error:', error)
        }
    }

    /**
     * Creates a new group.
     * 
     * **Case 4: Mutation handling**
     * **Case 6: Cache invalidation**
     * After creating group, access matrix will update automatically.
     */
    @action async createGroup(data: { name: string; roles: number[]; description: string }) {
        await groupsEntityHttp.createGroupMutation.mutate(data)
    }

    /**
     * Updates an existing group.
     */
    @action async updateGroup(
        id: GroupId,
        updates: Partial<Omit<GroupDto, 'id'>>
    ) {
        await groupsEntityHttp.updateGroupMutation.mutate({ id, updates })
    }

    /**
     * Deletes a group.
     */
    @action async deleteGroup(id: GroupId) {
        if (confirm('Are you sure you want to delete this group?')) {
            await groupsEntityHttp.deleteGroupMutation.mutate(id)
        }
    }

    /**
     * Manually refetches groups list.
     */
    @action refetchGroups() {
        groupsEntityHttp.getAllGroupsQuery.refetch()
    }

    // ==================== Access Matrix ====================

    /**
     * Gets all users from entity store.
     */
    @computed get users(): UserDto[] {
        return usersEntityHttp.getAllUsersQuery.data || []
    }

    /**
     * Gets all access records from entity store.
     */
    @computed get accessRecords(): AccessDto[] {
        return accessEntityHttp.getAllAccessQuery.data || []
    }

    /**
     * Checks if access data is loading.
     */
    @computed get isAccessLoading(): boolean {
        return (
            accessEntityHttp.getAllAccessQuery.isLoading ||
            usersEntityHttp.getAllUsersQuery.isLoading
        )
    }

    /**
     * Checks if access data is being fetched.
     */
    @computed get isAccessFetching(): boolean {
        return (
            accessEntityHttp.getAllAccessQuery.isFetching ||
            usersEntityHttp.getAllUsersQuery.isFetching
        )
    }

    /**
     * Gets error if access query failed.
     */
    @computed get accessError(): Error | null {
        return accessEntityHttp.getAllAccessQuery.error || usersEntityHttp.getAllUsersQuery.error
    }

    /**
     * Checks if access mutation is pending.
     */
    @computed get isAccessMutating(): boolean {
        return accessEntityHttp.updateAccessMutation.isPending
    }

    /**
     * Filters users by search query.
     * Supports multiple space-separated search terms.
     * 
     * **Case 5: Reading from cache for filtering**
     * All data comes from cache, no additional requests needed.
     */
    @computed get filteredUsers(): UserDto[] {
        if (!this.searchQuery.trim()) {
            return this.users
        }

        const terms = this.searchQuery
            .toLowerCase()
            .split(' ')
            .filter((t) => t.length > 0)

        return this.users.filter((user) => {
            const userName = user.name.toLowerCase()
            const userEmail = user.email.toLowerCase()
            
            return terms.every(
                (term) => userName.includes(term) || userEmail.includes(term)
            )
        })
    }

    /**
     * Sets search query.
     */
    @action setSearchQuery(query: string) {
        this.searchQuery = query
    }

    /**
     * Clears search query.
     */
    @action clearSearch() {
        this.searchQuery = ''
    }

    /**
     * Checks if user has access to group.
     * 
     * **Case 5: Reading from cache without requests**
     */
    hasAccess(userId: UserId, groupId: GroupId): boolean {
        const access = this.accessRecords.find((a) => a.subject === userId)
        return access?.groups.includes(groupId) || false
    }

    /**
     * Toggles user access to group.
     * 
     * **Case 4: Mutation handling**
     * **Case 5: Cache manipulation**
     * Updates access matrix immediately in cache.
     */
    @action async toggleAccess(userId: UserId, groupId: GroupId) {
        const access = this.accessRecords.find((a) => a.subject === userId)
        
        if (!access) {
            console.error('Access record not found for user:', userId)
            return
        }

        const hasAccess = access.groups.includes(groupId)
        const updatedGroups = hasAccess
            ? access.groups.filter((g) => g !== groupId)
            : [...access.groups, groupId]

        await accessEntityHttp.updateAccessMutation.mutate({
            subject: userId,
            updates: { groups: updatedGroups },
        })
    }

    /**
     * Manually refetches access records.
     */
    @action refetchAccess() {
        accessEntityHttp.getAllAccessQuery.refetch()
        usersEntityHttp.getAllUsersQuery.refetch()
    }
}
