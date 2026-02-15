import { Request, Response } from 'express'
import { database } from '../db/Database.js'
import { ApiResponse, UserDto } from '@sandbox/common'

/**
 * Controller for User entity HTTP endpoints.
 */
export class UsersController {
    /**
     * GET /api/http/users - Get all users.
     */
    async getAll(_req: Request, res: Response<ApiResponse<UserDto[]>>) {
        try {
            const users = await database.getUsers()
            res.json({ success: true, data: users })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * GET /api/http/users/:id - Get user by ID.
     */
    async getById(req: Request, res: Response<ApiResponse<UserDto>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user ID',
                })
            }

            const user = await database.getUserById(id)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                })
            }

            res.json({ success: true, data: user })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * POST /api/http/users - Create new user.
     */
    async create(req: Request, res: Response<ApiResponse<UserDto>>) {
        try {
            const { name, email } = req.body

            if (!name || !email) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and email are required',
                })
            }

            const newUser = await database.createUser({ name, email })
            res.status(201).json({ success: true, data: newUser })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * PUT /api/http/users/:id - Update user.
     */
    async update(req: Request, res: Response<ApiResponse<UserDto>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user ID',
                })
            }

            const { name, email } = req.body
            const updates: Partial<Omit<UserDto, 'id'>> = {}
            if (name !== undefined) updates.name = name
            if (email !== undefined) updates.email = email

            const updatedUser = await database.updateUser(id, updates)
            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                })
            }

            res.json({ success: true, data: updatedUser })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * DELETE /api/http/users/:id - Delete user.
     */
    async delete(req: Request, res: Response<ApiResponse<{ id: number }>>) {
        try {
            const id = parseInt(req.params.id, 10)
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user ID',
                })
            }

            const deleted = await database.deleteUser(id)
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                })
            }

            res.json({ success: true, data: { id } })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }
}

export const usersController = new UsersController()
