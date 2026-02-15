import { action, computed, makeObservable, observable, runInAction } from 'mobx'

import { GroupDto, GroupId, RoleDto } from '@/common'
import { groupsEntityHttp } from '@/stores/entities/GroupsEntityHttp'
import { rolesEntityHttp } from '@/stores/entities/RolesEntityHttp'

/**
 * State store for Group Profile Page.
 * Manages editing a single group with role multiselect.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * This class demonstrates:
 * - Using multiple Entity stores together (groups + roles)
 * - Managing form state for editing
 * - Reading from cache to avoid unnecessary requests (Case 5)
 * 
 * **Case 5: Cache reading**
 * Group data is first attempted to be read from cache,
 * falling back to server request only if not cached.
 */
export class GroupProfileState {
    @observable groupId: GroupId | null = null
    @observable isLoading = false
    @observable group: GroupDto | null = null
    @observable formData: { name: string; roles: number[]; description: string } = {
        name: '',
        roles: [],
        description: '',
    }
    @observable error: string | null = null
    @observable isSaving = false

    constructor() {
        makeObservable(this)
    }

    /**
     * Gets all available roles from entity store.
     * Used for multiselect options.
     */
    @computed get availableRoles(): RoleDto[] {
        return rolesEntityHttp.getAllRolesQuery.data || []
    }

    /**
     * Checks if roles are loading.
     */
    @computed get isRolesLoading(): boolean {
        return rolesEntityHttp.getAllRolesQuery.isLoading
    }

    /**
     * Checks if form has unsaved changes.
     */
    @computed get hasChanges(): boolean {
        if (!this.group) {
            return false
        }

        return (
            this.formData.name !== this.group.name ||
            this.formData.description !== (this.group.description || '') ||
            JSON.stringify(this.formData.roles.sort()) !==
                JSON.stringify(this.group.roles.sort())
        )
    }

    /**
     * Checks if form is valid.
     */
    @computed get isFormValid(): boolean {
        return this.formData.name.trim().length > 0
    }

    /**
     * Loads group by ID.
     * 
     * **Case 5: Cache reading optimization**
     * First tries to get group from cache, only fetches if not found.
     */
    @action async loadGroup(id: GroupId) {
        this.groupId = id
        this.isLoading = true
        this.error = null

        try {
            /**
             * **Case 5: Read from cache first**
             * The getGroupById method in entity checks cache before fetching.
             */
            const group = await groupsEntityHttp.getGroupById(id)

            if (!group) {
                throw new Error('Group not found')
            }

            runInAction(() => {
                this.group = group
                this.formData = {
                    name: group.name,
                    roles: [...group.roles],
                    description: group.description || '',
                }
                this.isLoading = false
            })
        } catch (err) {
            runInAction(() => {
                this.error = err instanceof Error ? err.message : 'Unknown error'
                this.isLoading = false
            })
        }
    }

    /**
     * Updates form field value.
     */
    @action updateFormField(
        field: 'name' | 'roles' | 'description',
        value: string | number[]
    ) {
        (this.formData as Record<string, unknown>)[field] = value
    }

    /**
     * Saves changes to the group.
     * 
     * **Case 4: Mutation handling**
     * **Case 5: Cache update**
     * After saving, the cache is automatically updated by the entity store.
     */
    @action async saveChanges() {
        if (!this.group || !this.isFormValid) {
            return
        }

        this.isSaving = true
        this.error = null

        try {
            await groupsEntityHttp.updateGroupMutation.mutate({
                id: this.group.id,
                updates: {
                    name: this.formData.name,
                    roles: this.formData.roles,
                    description: this.formData.description || undefined,
                },
            })

            // Reload group to get updated data from cache
            await this.loadGroup(this.group.id)

            runInAction(() => {
                this.isSaving = false
            })
        } catch (err) {
            runInAction(() => {
                this.error = err instanceof Error ? err.message : 'Unknown error'
                this.isSaving = false
            })
        }
    }

    /**
     * Resets form to original group data.
     */
    @action resetForm() {
        if (!this.group) {
            return
        }

        this.formData = {
            name: this.group.name,
            roles: [...this.group.roles],
            description: this.group.description || '',
        }
    }

    /**
     * Clears state (useful when unmounting component).
     */
    @action clear() {
        this.groupId = null
        this.group = null
        this.isLoading = false
        this.error = null
        this.isSaving = false
        this.formData = { name: '', roles: [], description: '' }
    }
}
