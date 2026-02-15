import { observer } from 'mobx-react'
import { useMemo } from 'react'

import { GroupsPageState, rolesEntityHttp } from '@/stores'

import { GroupsAccess } from './GroupsAccess'
import { GroupsCatalog } from './GroupsCatalog'
import './GroupsPage.css'

/**
 * Groups page with catalog and access matrix.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * **Case 4-6: Mutations, Cache reading, and Cache invalidation**
 * 
 * This page demonstrates advanced integration patterns:
 * 
 * 1. **Multiple Entity Stores**
 *    Uses groups, roles, users, and access entity stores together.
 * 
 * 2. **Cache Invalidation Between Components**
 *    When groups are created/deleted in catalog, access matrix
 *    automatically updates thanks to cache invalidation.
 * 
 * 3. **Cache Reading for Performance**
 *    User search filters data from cache without additional requests.
 * 
 * 4. **Real-time Collaboration**
 *    Multiple users can modify access matrix simultaneously.
 * 
 * Try these scenarios:
 * 
 * - Create group → Access matrix automatically adds new column
 * - Delete group → Access matrix automatically removes column
 * - Search users → Instant filtering without API calls
 * - Toggle access checkboxes → Instant updates with cache manipulation
 */
export const GroupsPage = observer(() => {
    // Create state instance once using useMemo
    const state = useMemo(() => new GroupsPageState(), [])

    // Get available roles for multiselect
    const availableRoles = rolesEntityHttp.getAllRolesQuery.data || []

    return (
        <div className="groups-page">
            <div className="groups-page__section">
                <GroupsCatalog state={state} availableRoles={availableRoles} />
            </div>
            <div className="groups-page__section">
                <GroupsAccess state={state} />
            </div>
        </div>
    )
})
