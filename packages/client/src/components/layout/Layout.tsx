import { observer } from 'mobx-react'
import { Outlet } from 'react-router-dom'

import { Breadcrumbs } from './Breadcrumbs'
import { Footer } from './Footer'
import { Header } from './Header'
import './Layout.css'

/**
 * Main layout component with header, breadcrumbs, content area, and footer.
 */
export const Layout = observer(function Layout() {
    return (
        <div className="layout">
            <Header />
            <Breadcrumbs />
            <main className="layout__content">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
})
