import { Request, Response } from 'express'
import { database } from '../db/Database.js'
import { ApiResponse, RoleDto } from '@sandbox/common'

/**
 * Controller for Role entity HTTP endpoints.
 */
export class RolesController {
    /**
     * GET /api/http/roles - Get all roles.
     */
    async getAll(_req: Request, res: Response<ApiResponse<RoleDto[]>>) {
        try {
            const roles = await database.getRoles()
            res.json({ success: true, data: roles })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * GET /api/http/roles/:id - Get role by ID.
     */
    async getById(req: Request, res: Response<ApiResponse<RoleDto>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role ID',
                })
            }

            const role = await database.getRoleById(id)
            if (!role) {
                return res.status(404).json({
                    success: false,
                    error: 'Role not found',
                })
            }

            res.json({ success: true, data: role })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * POST /api/http/roles - Create new role.
     */
    async create(req: Request, res: Response<ApiResponse<RoleDto>>) {
        try {
            const { name } = req.body

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required',
                })
            }

            const newRole = await database.createRole({ name })
            res.status(201).json({ success: true, data: newRole })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * PUT /api/http/roles/:id - Update role.
     */
    async update(req: Request, res: Response<ApiResponse<RoleDto>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role ID',
                })
            }

            const { name } = req.body
            const updates: Partial<Omit<RoleDto, 'id'>> = {}
            if (name !== undefined) updates.name = name

            const updatedRole = await database.updateRole(id, updates)
            if (!updatedRole) {
                return res.status(404).json({
                    success: false,
                    error: 'Role not found',
                })
            }

            res.json({ success: true, data: updatedRole })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * DELETE /api/http/roles/:id - Delete role.
     */
    async delete(req: Request, res: Response<ApiResponse<{ id: number }>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role ID',
                })
            }

            const deleted = await database.deleteRole(id)
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Role not found',
                })
            }

            res.json({ success: true, data: { id } })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }
}

export const rolesController = new RolesController()
