import { Link, useLocation, useParams } from 'react-router-dom'

import { groupsEntityHttp } from '@/stores'

import './Breadcrumbs.css'

/**
 * Breadcrumbs component for navigation.
 * Displays path from Home to current page with links.
 */
export function Breadcrumbs() {
    const location = useLocation()
    const params = useParams<{ id: string }>()
    
    const pathSegments = location.pathname.split('/').filter(Boolean)
    
    // Build breadcrumb items based on current route
    const breadcrumbs: Array<{ label: string; path?: string }> = [
        { label: 'Home', path: '/' },
    ]

    if (pathSegments.length === 0) {
        // On home page, no additional breadcrumbs
        return null
    }

    pathSegments.forEach((segment, index) => {
        const path = `/${pathSegments.slice(0, index + 1).join('/')}`
        
        // Capitalize first letter
        let label = segment.charAt(0).toUpperCase() + segment.slice(1)
        
        // Special handling for group profile page
        if (segment === 'groups' && pathSegments[index + 1]) {
            // Groups catalog page
            breadcrumbs.push({ label: 'Groups', path: '/groups' })
            
            // Try to get group name from cache
            const groupId = parseInt(pathSegments[index + 1], 10)
            const cachedGroups = groupsEntityHttp.getAllGroupsQuery.data
            const group = cachedGroups?.find((g) => g.id === groupId)
            
            breadcrumbs.push({
                label: group?.name || `Group #${groupId}`,
                // No path for last breadcrumb (current page)
            })
            
            return // Skip the next segment (already handled)
        }
        
        // Skip if this is the group ID segment (already handled above)
        if (index > 0 && pathSegments[index - 1] === 'groups' && !isNaN(parseInt(segment, 10))) {
            return
        }
        
        // Add breadcrumb for regular pages
        if (index === pathSegments.length - 1) {
            // Last segment - current page (no link)
            breadcrumbs.push({ label })
        } else {
            // Intermediate segment - add link
            breadcrumbs.push({ label, path })
        }
    })

    return (
        <nav className="breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
                <span key={index} className="breadcrumbs__item">
                    {crumb.path ? (
                        <Link
                            to={crumb.path}
                            className={
                                index === breadcrumbs.length - 1
                                    ? 'breadcrumbs__link breadcrumbs__link--active'
                                    : 'breadcrumbs__link'
                            }
                        >
                            {crumb.label}
                        </Link>
                    ) : (
                        <span className="breadcrumbs__text breadcrumbs__text--current">
                            {crumb.label}
                        </span>
                    )}
                    {index < breadcrumbs.length - 1 && (
                        <span className="breadcrumbs__separator">/</span>
                    )}
                </span>
            ))}
        </nav>
    )
}
