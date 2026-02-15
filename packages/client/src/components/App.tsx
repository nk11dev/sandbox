import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import { Layout } from './layout/Layout'
import { UsersPage } from './users/UsersPage'

/**
 * Placeholder page for routes not yet implemented.
 */
function PlaceholderPage({ title }: { title: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
            <h1>{title}</h1>
            <p className="text-secondary">This page will be implemented later.</p>
            <p className="text-secondary">
                For now, check out the Users page to see the full integration!
            </p>
        </div>
    )
}

/**
 * Main App component with routing.
 */
export function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/users" replace />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route
                        path="roles"
                        element={<PlaceholderPage title="Roles" />}
                    />
                    <Route
                        path="groups"
                        element={<PlaceholderPage title="Groups" />}
                    />
                    <Route
                        path="groups/:id"
                        element={<PlaceholderPage title="Group Profile" />}
                    />
                    <Route
                        path="*"
                        element={<PlaceholderPage title="404 - Page Not Found" />}
                    />
                </Route>
            </Routes>
        </Router>
    )
}
