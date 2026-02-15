import { Request, Response } from 'express'
import { database } from '../db/Database.js'
import { ApiResponse, AccessDto } from '@sandbox/common'

/**
 * Controller for Access entity HTTP endpoints.
 */
export class AccessController {
    /**
     * GET /api/http/access - Get all access records.
     */
    async getAll(_req: Request, res: Response<ApiResponse<AccessDto[]>>) {
        try {
            const access = await database.getAccess()
            res.json({ success: true, data: access })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * GET /api/http/access/:subject - Get access by subject (user ID).
     */
    async getBySubject(req: Request, res: Response<ApiResponse<AccessDto>>) {
        try {
            const subject = parseInt(req.params.subject, 10)
            if (isNaN(subject)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid subject ID',
                })
            }

            const access = await database.getAccessBySubject(subject)
            if (!access) {
                return res.status(404).json({
                    success: false,
                    error: 'Access not found',
                })
            }

            res.json({ success: true, data: access })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }

    /**
     * PUT /api/http/access/:subject - Update access for a subject.
     */
    async update(req: Request, res: Response<ApiResponse<AccessDto>>) {
        try {
            const subject = parseInt(req.params.subject, 10)
            if (isNaN(subject)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid subject ID',
                })
            }

            const { groups } = req.body
            if (!groups || !Array.isArray(groups)) {
                return res.status(400).json({
                    success: false,
                    error: 'Groups array is required',
                })
            }

            const updatedAccess = await database.updateAccess(subject, groups)
            res.json({ success: true, data: updatedAccess })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            res.status(500).json({ success: false, error: message })
        }
    }
}

export const accessController = new AccessController()
