/**
 * Unique identifier for a User entity.
 */
export type UserId = number

/**
 * Data Transfer Object representing a User entity.
 * 
 * @property id - Unique user identifier
 * @property name - Full name of the user
 * @property email - Email address of the user
 */
export interface UserDto {
    id: UserId
    name: string
    email: string
}
