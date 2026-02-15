import { observer } from 'mobx-react'

import { RoleDto } from '@/common'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Table } from '@/components/ui/Table'
import {
    RolesListStateHttp,
    RolesListStateWebSocket,
} from '@/stores'

import './RolesList.css'

/**
 * Interface that both HTTP and WebSocket state stores must implement.
 * This enables transport-agnostic components.
 * 
 * **Case 3: Universal Component with Multiple Transports**
 */
interface IRolesListState {
    roles: RoleDto[]
    isLoading: boolean
    isFetching: boolean
    isMutating: boolean
    error: Error | null
    isModalOpen: boolean
    editingRole: RoleDto | null
    formData: { name: string }
    openCreateModal: () => void
    openEditModal: (role: RoleDto) => void
    closeModal: () => void
    updateFormField: (field: 'name', value: string) => void
    submitForm: () => Promise<void>
    deleteRole: (id: number) => Promise<void>
    refetch: () => void
}

interface RolesListProps {
    state: IRolesListState
    title: string
}

/**
 * Universal RolesList component that works with any transport.
 * 
 * **Case 3: Transport-Agnostic Component**
 * This component demonstrates:
 * - Single component working with both HTTP and WebSocket
 * - Dependency injection pattern with state prop
 * - Type-safe interface ensuring compatibility
 * - No knowledge of underlying transport mechanism
 * 
 * **Case 4-6: Mutations and Caching**
 * User interactions trigger mutations that:
 * - Update local cache immediately (optimistic updates)
 * - Trigger server requests
 * - Handle WebSocket events for real-time sync
 * - Invalidate related queries (groups depend on roles)
 * 
 * @example HTTP usage:
 * ```tsx
 * const httpState = new RolesListStateHttp()
 * <RolesList state={httpState} title="Roles (HTTP)" />
 * ```
 * 
 * @example WebSocket usage:
 * ```tsx
 * const wsState = new RolesListStateWebSocket()
 * <RolesList state={wsState} title="Roles (WebSocket)" />
 * ```
 */
export const RolesList = observer(({ state, title }: RolesListProps) => {
    const columns = [
        {
            header: 'ID',
            accessor: 'id' as const,
            width: '80px',
        },
        {
            header: 'Name',
            accessor: 'name' as const,
        },
        {
            header: 'Actions',
            accessor: (role: RoleDto) => (
                <div className="roles-list__actions">
                    <Button
                        variant="secondary"
                        onClick={() => state.openEditModal(role)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => state.deleteRole(role.id)}
                    >
                        Delete
                    </Button>
                </div>
            ),
            width: '200px',
        },
    ]

    return (
        <div className="roles-list">
            <div className="roles-list__header">
                <div className="roles-list__title-wrapper">
                    <h2 className="roles-list__title">{title}</h2>
                    {state.isFetching && !state.isLoading && (
                        <Spinner />
                    )}
                </div>
                <div className="roles-list__actions">
                    <Button
                        variant="secondary"
                        onClick={() => state.refetch()}
                        disabled={state.isFetching || state.isMutating}
                    >
                        Refetch
                    </Button>
                    <Button
                        onClick={() => state.openCreateModal()}
                        disabled={state.isMutating}
                    >
                        Create Role
                    </Button>
                </div>
            </div>

            {state.isLoading ? (
                <div className="roles-list__loading">
                    <Spinner />
                    <p>Loading roles...</p>
                </div>
            ) : state.error ? (
                <div className="roles-list__error">
                    Error: {state.error.message}
                </div>
            ) : (
                <Table
                    columns={columns}
                    data={state.roles}
                    keyExtractor={(role) => role.id}
                />
            )}

            <Modal
                isOpen={state.isModalOpen}
                onClose={() => state.closeModal()}
                title={state.editingRole ? 'Edit Role' : 'Create Role'}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        state.submitForm()
                    }}
                >
                    <Input
                        label="Name"
                        value={state.formData.name}
                        onChange={(value) => state.updateFormField('name', value)}
                        required
                    />
                    <div className="roles-list__modal-actions">
                        <Button
                            variant="secondary"
                            onClick={() => state.closeModal()}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={state.isMutating}
                        >
                            {state.editingRole ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
})

// Type guard to ensure state implements the interface
export function createRolesListState(
    state: RolesListStateHttp | RolesListStateWebSocket
): IRolesListState {
    return state as IRolesListState
}
