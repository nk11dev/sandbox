import { observer } from 'mobx-react'

import { UserDto } from '@/common'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Table } from '@/components/ui/Table'
import {
    UsersListStateHttp,
    UsersListStateWebSocket,
} from '@/stores'

import './UsersList.css'

/**
 * Interface that both HTTP and WebSocket state stores must implement.
 * This enables transport-agnostic components.
 * 
 * **Case 3: Universal Component with Multiple Transports**
 */
interface IUsersListState {
    users: UserDto[]
    isLoading: boolean
    isFetching: boolean
    isMutating: boolean
    error: Error | null
    isModalOpen: boolean
    editingUser: UserDto | null
    formData: { name: string; email: string }
    openCreateModal: () => void
    openEditModal: (user: UserDto) => void
    closeModal: () => void
    updateFormField: (field: 'name' | 'email', value: string) => void
    submitForm: () => Promise<void>
    deleteUser: (id: number) => Promise<void>
    refetch: () => void
}

interface UsersListProps {
    state: IUsersListState
    title: string
}

/**
 * Universal UsersList component that works with any transport.
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
 * 
 * @example HTTP usage:
 * ```tsx
 * const httpState = new UsersListStateHttp()
 * <UsersList state={httpState} title="Users (HTTP)" />
 * ```
 * 
 * @example WebSocket usage:
 * ```tsx
 * const wsState = new UsersListStateWebSocket()
 * <UsersList state={wsState} title="Users (WebSocket)" />
 * ```
 */
export const UsersList = observer(({ state, title }: UsersListProps) => {
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
            header: 'Email',
            accessor: 'email' as const,
        },
        {
            header: 'Actions',
            accessor: (user: UserDto) => (
                <div className="users-list__actions">
                    <Button
                        variant="secondary"
                        onClick={() => state.openEditModal(user)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => state.deleteUser(user.id)}
                    >
                        Delete
                    </Button>
                </div>
            ),
            width: '200px',
        },
    ]

    return (
        <div className="users-list">
            <div className="users-list__header">
                <div className="users-list__title-wrapper">
                    <h2 className="users-list__title">{title}</h2>
                    {state.isFetching && !state.isLoading && (
                        <Spinner />
                    )}
                </div>
                <div className="users-list__actions">
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
                        Create User
                    </Button>
                </div>
            </div>

            {state.isLoading ? (
                <div className="users-list__loading">
                    <Spinner />
                    <p>Loading users...</p>
                </div>
            ) : state.error ? (
                <div className="users-list__error">
                    Error: {state.error.message}
                </div>
            ) : (
                <Table
                    columns={columns}
                    data={state.users}
                    keyExtractor={(user) => user.id}
                />
            )}

            <Modal
                isOpen={state.isModalOpen}
                onClose={() => state.closeModal()}
                title={state.editingUser ? 'Edit User' : 'Create User'}
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
                    <Input
                        label="Email"
                        type="email"
                        value={state.formData.email}
                        onChange={(value) => state.updateFormField('email', value)}
                        required
                    />
                    <div className="users-list__modal-actions">
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
                            {state.editingUser ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
})

// Type guard to ensure state implements the interface
export function createUsersListState(
    state: UsersListStateHttp | UsersListStateWebSocket
): IUsersListState {
    return state as IUsersListState
}
