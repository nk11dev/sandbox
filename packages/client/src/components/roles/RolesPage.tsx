import { useMemo } from 'react'

import { RolesListStateHttp, RolesListStateWebSocket } from '@/stores'

import { RolesList } from './RolesList'
import './RolesPage.css'

/**
 * Roles page showcasing both HTTP and WebSocket transports side by side.
 * 
 * **Case 1: HTTP Transport**
 * Left block demonstrates MobX + TanStack Query + HTTP integration.
 * 
 * **Case 2: WebSocket Transport**
 * Right block demonstrates MobX + TanStack Query + WebSocket integration.
 * 
 * **Case 3: Universal Component**
 * Same RolesList component works with both transports.
 * 
 * **Case 4-6: Mutations and Caching**
 * Try these scenarios to test the integration:
 * 
 * 1. Create role via HTTP → Both blocks update
 * 2. Create role via WebSocket → Both blocks update
 * 3. Update role in one block → Other block syncs automatically
 * 4. Open two browser tabs → Changes sync across tabs in real-time
 * 5. Create/update/delete role → Groups page updates automatically (cache invalidation)
 */
export function RolesPage() {
    // Create state instances once using useMemo
    const httpState = useMemo(() => new RolesListStateHttp(), [])
    const wsState = useMemo(() => new RolesListStateWebSocket(), [])

    return (
        <div className="roles-page">
            <div className="roles-page__block">
                <RolesList state={httpState} title="Roles by HTTP" />
            </div>
            <div className="roles-page__block">
                <RolesList state={wsState} title="Roles by WebSocket" />
            </div>
        </div>
    )
}
