import { observer } from 'mobx-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { GroupsPageState } from '@/stores'

import './GroupsAccess.css'

interface GroupsAccessProps {
    state: GroupsPageState
}

/**
 * GroupsAccess component displays a matrix of user-group access with checkboxes.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * **Case 4: Mutations handling**
 * **Case 5: Cache reading for filtering and access checks**
 * **Case 6: Cache invalidation**
 * 
 * When groups are created/deleted in catalog above, this matrix automatically
 * updates thanks to cache invalidation in entity stores.
 * 
 * The search feature demonstrates reading from cache without additional requests.
 */
export const GroupsAccess = observer(({ state }: GroupsAccessProps) => {
    return (
        <div className="groups-access">
            <div className="groups-access__header">
                <div className="groups-access__title-wrapper">
                    <h2 className="groups-access__title">Groups Access</h2>
                    {state.isAccessFetching && !state.isAccessLoading && <Spinner />}
                </div>
                <div className="groups-access__actions">
                    <Button
                        variant="secondary"
                        onClick={() => state.refetchAccess()}
                        disabled={state.isAccessFetching || state.isAccessMutating}
                    >
                        Refetch
                    </Button>
                </div>
            </div>

            {/* Search input */}
            <div className="groups-access__search">
                <Input
                    placeholder="Search users by name or email (space-separated terms)..."
                    value={state.searchQuery}
                    onChange={(value) => state.setSearchQuery(value)}
                />
                {state.searchQuery && (
                    <Button
                        variant="secondary"
                        onClick={() => state.clearSearch()}
                    >
                        Clear
                    </Button>
                )}
            </div>

            {state.isAccessLoading ? (
                <div className="groups-access__loading">
                    <Spinner />
                    <p>Loading access matrix...</p>
                </div>
            ) : state.accessError ? (
                <div className="groups-access__error">
                    Error: {state.accessError.message}
                </div>
            ) : state.groups.length === 0 ? (
                <div className="groups-access__empty">
                    No groups yet. Create groups in the catalog above.
                </div>
            ) : state.filteredUsers.length === 0 ? (
                <div className="groups-access__empty">
                    {state.searchQuery 
                        ? 'No users found matching your search.' 
                        : 'No users available.'}
                </div>
            ) : (
                <div className="groups-access__table-container">
                    <table className="groups-access__table">
                        <thead>
                            <tr>
                                <th className="groups-access__user-cell">User</th>
                                {state.groups.map((group) => (
                                    <th key={group.id} className="groups-access__group-cell">
                                        {group.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {state.filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="groups-access__user-cell">
                                        <div className="groups-access__user-info">
                                            <div className="groups-access__user-name">
                                                {user.name}
                                            </div>
                                            <div className="groups-access__user-email">
                                                {user.email}
                                            </div>
                                        </div>
                                    </td>
                                    {state.groups.map((group) => {
                                        const hasAccess = state.hasAccess(user.id, group.id)
                                        return (
                                            <td
                                                key={group.id}
                                                className="groups-access__checkbox-cell"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={hasAccess}
                                                    onChange={() =>
                                                        state.toggleAccess(user.id, group.id)
                                                    }
                                                    disabled={state.isAccessMutating}
                                                    className="groups-access__checkbox"
                                                />
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {state.searchQuery && state.filteredUsers.length > 0 && (
                <div className="groups-access__search-info">
                    Showing {state.filteredUsers.length} of {state.users.length} users
                </div>
            )}
        </div>
    )
})
