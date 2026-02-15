import { UserId } from './User'
import { GroupId } from './Group'

/**
 * Data Transfer Object representing access control.
 * Maps users to groups they have access to.
 * 
 * @property subject - User ID who has access
 * @property groups - Array of group IDs the user has access to
 */
export interface AccessDto {
    subject: UserId
    groups: GroupId[]
}
