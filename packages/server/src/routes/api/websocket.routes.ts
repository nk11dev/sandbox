import { Server as SocketIOServer, Socket } from 'socket.io'
import { database } from '../../db/Database.js'
import { ApiResponse, UserDto, RoleDto, GroupDto, AccessDto } from '@sandbox/common'

/**
 * Defines callback type for Socket.io acknowledgments.
 */
type AckCallback<T> = (response: ApiResponse<T>) => void

/**
 * Sets up WebSocket event handlers.
 * Events follow the pattern: entity:action
 * 
 * @param io - Socket.io server instance
 */
export function setupWebSocketHandlers(io: SocketIOServer) {
    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Client connected: ${socket.id}`)

        // Users handlers
        socket.on('users:getAll', async (ack: AckCallback<UserDto[]>) => {
            try {
                const users = await database.getUsers()
                ack({ success: true, data: users })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('users:getById', async (
            { id }: { id: number }, 
            ack: AckCallback<UserDto>
        ) => {
            try {
                const user = await database.getUserById(id)
                if (!user) {
                    return ack({ success: false, error: 'User not found' })
                }
                ack({ success: true, data: user })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('users:create', async (
            data: Omit<UserDto, 'id'>, 
            ack: AckCallback<UserDto>
        ) => {
            try {
                const newUser = await database.createUser(data)
                ack({ success: true, data: newUser })
                // Broadcast to all clients including sender
                io.emit('users:created', { timestamp: Date.now() })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('users:update', async (
            { id, ...updates }: { id: number } & Partial<Omit<UserDto, 'id'>>,
            ack: AckCallback<UserDto>
        ) => {
            try {
                const updatedUser = await database.updateUser(id, updates)
                if (!updatedUser) {
                    return ack({ success: false, error: 'User not found' })
                }
                ack({ success: true, data: updatedUser })
                io.emit('users:updated', { id })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('users:delete', async (
            { id }: { id: number }, 
            ack: AckCallback<{ id: number }>
        ) => {
            try {
                const deleted = await database.deleteUser(id)
                if (!deleted) {
                    return ack({ success: false, error: 'User not found' })
                }
                ack({ success: true, data: { id } })
                io.emit('users:deleted', { id })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        // Roles handlers
        socket.on('roles:getAll', async (ack: AckCallback<RoleDto[]>) => {
            try {
                const roles = await database.getRoles()
                ack({ success: true, data: roles })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('roles:getById', async (
            { id }: { id: number }, 
            ack: AckCallback<RoleDto>
        ) => {
            try {
                const role = await database.getRoleById(id)
                if (!role) {
                    return ack({ success: false, error: 'Role not found' })
                }
                ack({ success: true, data: role })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('roles:create', async (
            data: Omit<RoleDto, 'id'>, 
            ack: AckCallback<RoleDto>
        ) => {
            try {
                const newRole = await database.createRole(data)
                ack({ success: true, data: newRole })
                io.emit('roles:created', { timestamp: Date.now() })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('roles:update', async (
            { id, ...updates }: { id: number } & Partial<Omit<RoleDto, 'id'>>,
            ack: AckCallback<RoleDto>
        ) => {
            try {
                const updatedRole = await database.updateRole(id, updates)
                if (!updatedRole) {
                    return ack({ success: false, error: 'Role not found' })
                }
                ack({ success: true, data: updatedRole })
                io.emit('roles:updated', { id })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('roles:delete', async (
            { id }: { id: number }, 
            ack: AckCallback<{ id: number }>
        ) => {
            try {
                const deleted = await database.deleteRole(id)
                if (!deleted) {
                    return ack({ success: false, error: 'Role not found' })
                }
                ack({ success: true, data: { id } })
                io.emit('roles:deleted', { id })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        // Groups handlers
        socket.on('groups:getAll', async (ack: AckCallback<GroupDto[]>) => {
            try {
                const groups = await database.getGroups()
                ack({ success: true, data: groups })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('groups:getById', async (
            { id }: { id: number }, 
            ack: AckCallback<GroupDto>
        ) => {
            try {
                const group = await database.getGroupById(id)
                if (!group) {
                    return ack({ success: false, error: 'Group not found' })
                }
                ack({ success: true, data: group })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('groups:create', async (
            data: Omit<GroupDto, 'id'>, 
            ack: AckCallback<GroupDto>
        ) => {
            try {
                const newGroup = await database.createGroup(data)
                ack({ success: true, data: newGroup })
                io.emit('groups:created', { timestamp: Date.now() })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('groups:update', async (
            { id, ...updates }: { id: number } & Partial<Omit<GroupDto, 'id'>>,
            ack: AckCallback<GroupDto>
        ) => {
            try {
                const updatedGroup = await database.updateGroup(id, updates)
                if (!updatedGroup) {
                    return ack({ success: false, error: 'Group not found' })
                }
                ack({ success: true, data: updatedGroup })
                io.emit('groups:updated', { id })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('groups:delete', async (
            { id }: { id: number }, 
            ack: AckCallback<{ id: number }>
        ) => {
            try {
                const deleted = await database.deleteGroup(id)
                if (!deleted) {
                    return ack({ success: false, error: 'Group not found' })
                }
                ack({ success: true, data: { id } })
                io.emit('groups:deleted', { id })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        // Access handlers
        socket.on('access:getAll', async (ack: AckCallback<AccessDto[]>) => {
            try {
                const access = await database.getAccess()
                ack({ success: true, data: access })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('access:getBySubject', async (
            { subject }: { subject: number }, 
            ack: AckCallback<AccessDto>
        ) => {
            try {
                const access = await database.getAccessBySubject(subject)
                if (!access) {
                    return ack({ success: false, error: 'Access not found' })
                }
                ack({ success: true, data: access })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('access:update', async (
            { subject, groups }: { subject: number; groups: number[] },
            ack: AckCallback<AccessDto>
        ) => {
            try {
                const updatedAccess = await database.updateAccess(subject, groups)
                ack({ success: true, data: updatedAccess })
                io.emit('access:updated', { subject })
            } catch (error) {
                const message = error instanceof Error ? 
                    error.message : 
                    'Unknown error'
                ack({ success: false, error: message })
            }
        })

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`)
        })
    })

    console.log('  ✓ WebSocket handlers registered')
}
