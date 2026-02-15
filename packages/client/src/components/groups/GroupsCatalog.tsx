import { observer } from 'mobx-react'
import { Link } from 'react-router-dom'

import { GroupDto, RoleDto } from '@/common'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Table } from '@/components/ui/Table'
import { GroupsPageState } from '@/stores'

interface GroupsCatalogProps {
    state: GroupsPageState
    availableRoles: RoleDto[]
}

/**
 * GroupsCatalog component displays list of groups with CRUD operations.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * **Case 4: Mutations handling**
 * **Case 5: Cache reading**
 * **Case 6: Cache invalidation**
 * 
 * When groups are modified, the access matrix below automatically updates
 * thanks to cache invalidation in entity stores.
 */
export const GroupsCatalog = observer(({ state, availableRoles }: GroupsCatalogProps) => {
    const getRoleNames = (roleIds: number[]) => {
        return roleIds
            .map((id) => availableRoles.find((r) => r.id === id)?.name)
            .filter(Boolean)
            .join(', ')
    }

    const columns = [
        {
            header: 'ID',
            accessor: 'id' as const,
            width: '80px',
        },
        {
            header: 'Name',
            accessor: (group: GroupDto) => (
                <Link to={`/groups/${group.id}`} style={{ color: '#1976d2' }}>
                    {group.name}
                </Link>
            ),
        },
        {
            header: 'Roles',
            accessor: (group: GroupDto) => getRoleNames(group.roles) || '-',
        },
        {
            header: 'Description',
            accessor: (group: GroupDto) => group.description || '-',
        },
        {
            header: 'Actions',
            accessor: (group: GroupDto) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        variant="secondary"
                        onClick={() => state.openEditGroupModal(group)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => state.deleteGroup(group.id)}
                    >
                        Delete
                    </Button>
                </div>
            ),
            width: '200px',
        },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 500 }}>
                        Groups Catalog
                    </h2>
                    {state.isGroupsFetching && !state.isGroupsLoading && <Spinner />}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button
                        variant="secondary"
                        onClick={() => state.refetchGroups()}
                        disabled={state.isGroupsFetching || state.isGroupMutating}
                    >
                        Refetch
                    </Button>
                    <Button
                        onClick={() => state.openCreateGroupModal()}
                        disabled={state.isGroupMutating}
                    >
                        Create Group
                    </Button>
                </div>
            </div>

            {state.isGroupsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '12px' }}>
                    <Spinner />
                    <p>Loading groups...</p>
                </div>
            ) : state.groupsError ? (
                <div style={{ color: '#d32f2f', padding: '20px', textAlign: 'center' }}>
                    Error: {state.groupsError.message}
                </div>
            ) : (
                <Table
                    columns={columns}
                    data={state.groups}
                    keyExtractor={(group) => group.id}
                />
            )}

            <Modal
                isOpen={state.isGroupModalOpen}
                onClose={() => state.closeGroupModal()}
                title={state.editingGroup ? 'Edit Group' : 'Create Group'}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        state.submitGroupForm()
                    }}
                >
                    <Input
                        label="Name"
                        value={state.groupFormData.name}
                        onChange={(value) => state.updateGroupFormField('name', value)}
                        required
                    />
                    
                    <div style={{ marginTop: '16px' }}>
                        <label 
                            htmlFor="group-roles-select"
                            style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}
                        >
                            Roles
                        </label>
                        <select
                            id="group-roles-select"
                            multiple
                            value={state.groupFormData.roles.map(String)}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions).map(
                                    (opt) => parseInt(opt.value, 10)
                                )
                                state.updateGroupFormField('roles', selected)
                            }}
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontFamily: 'Roboto, sans-serif',
                            }}
                        >
                            {availableRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                        <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                            Hold Ctrl/Cmd to select multiple roles
                        </small>
                    </div>

                    <Input
                        label="Description"
                        value={state.groupFormData.description}
                        onChange={(value) => state.updateGroupFormField('description', value)}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                        <Button
                            variant="secondary"
                            onClick={() => state.closeGroupModal()}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={state.isGroupMutating}>
                            {state.editingGroup ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
})
