import { Link, useLocation } from 'react-router-dom'

import './Header.css'

/**
 * Application header with navigation.
 */
export function Header() {
    const location = useLocation()

    const isActive = (path: string) => location.pathname === path

    return (
        <header className="header">
            <nav className="header__nav">
                <Link
                    to="/"
                    className={`header__link ${isActive('/') ? 'header__link--active' : ''}`}
                >
                    Home
                </Link>
                <span className="header__separator">|</span>
                <Link
                    to="/users"
                    className={`header__link ${isActive('/users') ? 'header__link--active' : ''}`}
                >
                    Users
                </Link>
                <span className="header__separator">|</span>
                <Link
                    to="/roles"
                    className={`header__link ${isActive('/roles') ? 'header__link--active' : ''}`}
                >
                    Roles
                </Link>
                <span className="header__separator">|</span>
                <Link
                    to="/groups"
                    className={`header__link ${isActive('/groups') ? 'header__link--active' : ''}`}
                >
                    Groups
                </Link>
            </nav>
        </header>
    )
}
