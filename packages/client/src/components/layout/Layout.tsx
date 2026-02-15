import { Outlet } from 'react-router-dom'

import { Footer } from './Footer'
import { Header } from './Header'
import './Layout.css'

/**
 * Main layout component with header, content area, and footer.
 */
export function Layout() {
    return (
        <div className="layout">
            <Header />
            <main className="layout__content">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}
