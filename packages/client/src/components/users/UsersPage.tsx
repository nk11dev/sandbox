import { observer } from 'mobx-react'
import { useMemo } from 'react'

import { UsersListStateHttp, UsersListStateWebSocket } from '@/stores'

import { UsersList } from './UsersList'
import './UsersPage.css'

/**
 * Users page showcasing both HTTP and WebSocket transports side by side.
 * 
 * **Case 1: HTTP Transport**
 * Left block demonstrates MobX + TanStack Query + HTTP integration.
 * 
 * **Case 2: WebSocket Transport**
 * Right block demonstrates MobX + TanStack Query + WebSocket integration.
 * 
 * **Case 3: Universal Component**
 * Same UsersList component works with both transports.
 * 
 * **Case 4-6: Mutations and Caching**
 * Try these scenarios to test the integration:
 * 
 * 1. Create user via HTTP → Both blocks update
 * 2. Create user via WebSocket → Both blocks update
 * 3. Update user in one block → Other block syncs automatically
 * 4. Open two browser tabs → Changes sync across tabs in real-time
 */
export const UsersPage = observer(function UsersPage() {
    // Create state instances once using useMemo
    const httpState = useMemo(() => new UsersListStateHttp(), [])
    const wsState = useMemo(() => new UsersListStateWebSocket(), [])

    return (
        <div className="users-page">
            <div className="users-page__block">
                <UsersList state={httpState} title="Users by HTTP" />
            </div>
            <div className="users-page__block">
                <UsersList state={wsState} title="Users by WebSocket" />
            </div>
        </div>
    )
})
