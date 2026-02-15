import { Request, Response } from 'express'
import { database } from '../db/Database.js'
import { ApiResponse, GroupDto } from '@sandbox/common'

/**
 * Controller for Group entity HTTP endpoints.
 */
export class GroupsController {
    /**
     * GET /api/http/groups - Get all groups.
     */
    async getAll(_req: Request, res: Response<ApiResponse<GroupDto[]>>) {
        try {
            const groups = await database.getGroups()
            res.json({ success: true, data: groups })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * GET /api/http/groups/:id - Get group by ID.
     */
    async getById(req: Request, res: Response<ApiResponse<GroupDto>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid group ID',
                })
            }

            const group = await database.getGroupById(id)
            if (!group) {
                return res.status(404).json({
                    success: false,
                    error: 'Group not found',
                })
            }

            res.json({ success: true, data: group })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * POST /api/http/groups - Create new group.
     */
    async create(req: Request, res: Response<ApiResponse<GroupDto>>) {
        try {
            const { name, roles, description } = req.body

            if (!name || !roles) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and roles are required',
                })
            }

            const newGroup = await database.createGroup({ 
                name, 
                roles, 
                description,
            })
            res.status(201).json({ success: true, data: newGroup })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * PUT /api/http/groups/:id - Update group.
     */
    async update(req: Request, res: Response<ApiResponse<GroupDto>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid group ID',
                })
            }

            const { name, roles, description } = req.body
            const updates: Partial<Omit<GroupDto, 'id'>> = {}
            if (name !== undefined) updates.name = name
            if (roles !== undefined) updates.roles = roles
            if (description !== undefined) updates.description = description

            const updatedGroup = await database.updateGroup(id, updates)
            if (!updatedGroup) {
                return res.status(404).json({
                    success: false,
                    error: 'Group not found',
                })
            }

            res.json({ success: true, data: updatedGroup })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * DELETE /api/http/groups/:id - Delete group.
     */
    async delete(req: Request, res: Response<ApiResponse<{ id: number }>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid group ID',
                })
            }

            const deleted = await database.deleteGroup(id)
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Group not found',
                })
            }

            res.json({ success: true, data: { id } })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }
}

export const groupsController = new GroupsController()
