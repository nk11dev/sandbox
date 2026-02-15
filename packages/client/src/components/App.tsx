import { observer } from 'mobx-react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import { GroupProfilePage } from './groups/GroupProfilePage'
import { GroupsPage } from './groups/GroupsPage'
import { Layout } from './layout/Layout'
import { RolesPage } from './roles/RolesPage'
import { UsersPage } from './users/UsersPage'

/**
 * Placeholder page for routes not yet implemented.
 */
const PlaceholderPage = observer(function PlaceholderPage({ title }: { title: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
            <h1>{title}</h1>
            <p className="text-secondary">This page is not found.</p>
        </div>
    )
})

/**
 * Main App component with routing.
 * 
 * All pages demonstrate MobX + TanStack Query integration
 * with HTTP and WebSocket transports.
 */
export const App = observer(function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/users" replace />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="groups" element={<GroupsPage />} />
                    <Route path="groups/:id" element={<GroupProfilePage />} />
                    <Route
                        path="*"
                        element={<PlaceholderPage title="404 - Page Not Found" />}
                    />
                </Route>
            </Routes>
        </Router>
    )
})
