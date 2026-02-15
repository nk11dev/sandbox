import { Express, Router } from 'express'
import { Server as SocketIOServer } from 'socket.io'
import { usersController } from '../../controllers/users.controller.js'
import { rolesController } from '../../controllers/roles.controller.js'
import { groupsController } from '../../controllers/groups.controller.js'
import { accessController } from '../../controllers/access.controller.js'

/**
 * Sets up HTTP REST API routes.
 * All routes are prefixed with /api/http.
 * 
 * @param app - Express application instance
 * @param apiPath - Base API path (e.g., '/api')
 * @param io - Socket.io server instance for emitting events after mutations
 */
export function setupHttpRoutes(
    app: Express, 
    apiPath: string, 
    io: SocketIOServer
) {
    const router = Router()

    // Users routes
    router.get('/users', (req, res) => usersController.getAll(req, res))
    router.get('/users/:id', (req, res) => usersController.getById(req, res))
    router.post('/users', async (req, res) => {
        await usersController.create(req, res)
        // Emit WebSocket event after HTTP mutation
        io.emit('users:created', { timestamp: Date.now() })
    })
    router.put('/users/:id', async (req, res) => {
        await usersController.update(req, res)
        // Emit WebSocket event after HTTP mutation
        io.emit('users:updated', { id: parseInt(req.params.id, 10) })
    })
    router.delete('/users/:id', async (req, res) => {
        await usersController.delete(req, res)
        // Emit WebSocket event after HTTP mutation
        io.emit('users:deleted', { id: parseInt(req.params.id, 10) })
    })

    // Roles routes
    router.get('/roles', (req, res) => rolesController.getAll(req, res))
    router.get('/roles/:id', (req, res) => rolesController.getById(req, res))
    router.post('/roles', async (req, res) => {
        await rolesController.create(req, res)
        io.emit('roles:created', { timestamp: Date.now() })
    })
    router.put('/roles/:id', async (req, res) => {
        await rolesController.update(req, res)
        io.emit('roles:updated', { id: parseInt(req.params.id, 10) })
    })
    router.delete('/roles/:id', async (req, res) => {
        await rolesController.delete(req, res)
        io.emit('roles:deleted', { id: parseInt(req.params.id, 10) })
    })

    // Groups routes
    router.get('/groups', (req, res) => groupsController.getAll(req, res))
    router.get('/groups/:id', (req, res) => groupsController.getById(req, res))
    router.post('/groups', async (req, res) => {
        await groupsController.create(req, res)
        io.emit('groups:created', { timestamp: Date.now() })
    })
    router.put('/groups/:id', async (req, res) => {
        await groupsController.update(req, res)
        io.emit('groups:updated', { id: parseInt(req.params.id, 10) })
    })
    router.delete('/groups/:id', async (req, res) => {
        await groupsController.delete(req, res)
        io.emit('groups:deleted', { id: parseInt(req.params.id, 10) })
    })

    // Access routes
    router.get('/access', (req, res) => accessController.getAll(req, res))
    router.get('/access/:subject', (req, res) => 
        accessController.getBySubject(req, res)
    )
    router.put('/access/:subject', async (req, res) => {
        await accessController.update(req, res)
        io.emit('access:updated', { subject: parseInt(req.params.subject, 10) })
    })

    app.use(`${apiPath}/http`, router)
    console.log(`  ✓ HTTP routes registered at ${apiPath}/http`)
}
