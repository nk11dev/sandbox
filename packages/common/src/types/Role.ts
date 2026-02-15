/**
 * Unique identifier for a Role entity.
 */
export type RoleId = number

/**
 * Data Transfer Object representing a Role entity.
 * 
 * @property id - Unique role identifier
 * @property name - Name of the role
 */
export interface RoleDto {
    id: RoleId
    name: string
}
