import { RoleId } from './Role'

/**
 * Unique identifier for a Group entity.
 */
export type GroupId = number

/**
 * Data Transfer Object representing a Group entity.
 * 
 * @property id - Unique group identifier
 * @property name - Name of the group
 * @property roles - Array of role IDs associated with this group
 * @property description - Optional description of the group
 */
export interface GroupDto {
    id: GroupId
    name: string
    roles: RoleId[]
    description?: string
}
