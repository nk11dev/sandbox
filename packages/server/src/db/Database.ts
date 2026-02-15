import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { UserDto, RoleDto, GroupDto, AccessDto } from '@sandbox/common'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Database schema containing all collections.
 */
interface DatabaseSchema {
    users: UserDto[]
    roles: RoleDto[]
    groups: GroupDto[]
    access: AccessDto[]
}

/**
 * Database class for managing all data collections using LowDB.
 * Provides methods for CRUD operations on all entities.
 */
class Database {
    private db: Low<DatabaseSchema> | null = null

    /**
     * Initializes the database by loading data from JSON files.
     * Must be called before any database operations.
     */
    async initialize(): Promise<void> {
        const dataDir = join(__dirname, 'data')
        
        // Import initial data
        const usersModule = await import(join(dataDir, 'users.json'), {
            assert: { type: 'json' }
        })
        const rolesModule = await import(join(dataDir, 'roles.json'), {
            assert: { type: 'json' }
        })
        const groupsModule = await import(join(dataDir, 'groups.json'), {
            assert: { type: 'json' }
        })
        const accessModule = await import(join(dataDir, 'access.json'), {
            assert: { type: 'json' }
        })

        const defaultData: DatabaseSchema = {
            users: usersModule.default,
            roles: rolesModule.default,
            groups: groupsModule.default,
            access: accessModule.default,
        }

        const adapter = new JSONFile<DatabaseSchema>(join(dataDir, 'db.json'))
        this.db = new Low<DatabaseSchema>(adapter, defaultData)
        
        await this.db.read()
        
        if (!this.db.data) {
            this.db.data = defaultData
            await this.db.write()
        }

        console.log('✓ Database initialized')
    }

    private getDb(): Low<DatabaseSchema> {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.')
        }
        return this.db
    }

    // Users operations
    async getUsers(): Promise<UserDto[]> {
        const db = this.getDb()
        return db.data.users
    }

    async getUserById(id: number): Promise<UserDto | undefined> {
        const db = this.getDb()
        return db.data.users.find(user => user.id === id)
    }

    async createUser(user: Omit<UserDto, 'id'>): Promise<UserDto> {
        const db = this.getDb()
        const newId = Math.max(...db.data.users.map(u => u.id), 1000) + 1
        const newUser: UserDto = { ...user, id: newId }
        db.data.users.push(newUser)
        await db.write()
        return newUser
    }

    async updateUser(id: number, updates: Partial<Omit<UserDto, 'id'>>): 
        Promise<UserDto | null> {
        const db = this.getDb()
        const index = db.data.users.findIndex(user => user.id === id)
        if (index === -1) return null
        
        db.data.users[index] = { ...db.data.users[index], ...updates }
        await db.write()
        return db.data.users[index]
    }

    async deleteUser(id: number): Promise<boolean> {
        const db = this.getDb()
        const index = db.data.users.findIndex(user => user.id === id)
        if (index === -1) return false
        
        db.data.users.splice(index, 1)
        await db.write()
        return true
    }

    // Roles operations
    async getRoles(): Promise<RoleDto[]> {
        const db = this.getDb()
        return db.data.roles
    }

    async getRoleById(id: number): Promise<RoleDto | undefined> {
        const db = this.getDb()
        return db.data.roles.find(role => role.id === id)
    }

    async createRole(role: Omit<RoleDto, 'id'>): Promise<RoleDto> {
        const db = this.getDb()
        const newId = Math.max(...db.data.roles.map(r => r.id), 2000) + 1
        const newRole: RoleDto = { ...role, id: newId }
        db.data.roles.push(newRole)
        await db.write()
        return newRole
    }

    async updateRole(id: number, updates: Partial<Omit<RoleDto, 'id'>>): 
        Promise<RoleDto | null> {
        const db = this.getDb()
        const index = db.data.roles.findIndex(role => role.id === id)
        if (index === -1) return null
        
        db.data.roles[index] = { ...db.data.roles[index], ...updates }
        await db.write()
        return db.data.roles[index]
    }

    async deleteRole(id: number): Promise<boolean> {
        const db = this.getDb()
        const index = db.data.roles.findIndex(role => role.id === id)
        if (index === -1) return false
        
        db.data.roles.splice(index, 1)
        await db.write()
        return true
    }

    // Groups operations
    async getGroups(): Promise<GroupDto[]> {
        const db = this.getDb()
        return db.data.groups
    }

    async getGroupById(id: number): Promise<GroupDto | undefined> {
        const db = this.getDb()
        return db.data.groups.find(group => group.id === id)
    }

    async createGroup(group: Omit<GroupDto, 'id'>): Promise<GroupDto> {
        const db = this.getDb()
        const newId = Math.max(...db.data.groups.map(g => g.id), 3000) + 1
        const newGroup: GroupDto = { ...group, id: newId }
        db.data.groups.push(newGroup)
        await db.write()
        return newGroup
    }

    async updateGroup(id: number, updates: Partial<Omit<GroupDto, 'id'>>): 
        Promise<GroupDto | null> {
        const db = this.getDb()
        const index = db.data.groups.findIndex(group => group.id === id)
        if (index === -1) return null
        
        db.data.groups[index] = { ...db.data.groups[index], ...updates }
        await db.write()
        return db.data.groups[index]
    }

    async deleteGroup(id: number): Promise<boolean> {
        const db = this.getDb()
        const index = db.data.groups.findIndex(group => group.id === id)
        if (index === -1) return false
        
        db.data.groups.splice(index, 1)
        await db.write()
        return true
    }

    // Access operations
    async getAccess(): Promise<AccessDto[]> {
        const db = this.getDb()
        return db.data.access
    }

    async getAccessBySubject(subject: number): Promise<AccessDto | undefined> {
        const db = this.getDb()
        return db.data.access.find(access => access.subject === subject)
    }

    async updateAccess(subject: number, groups: number[]): 
        Promise<AccessDto> {
        const db = this.getDb()
        const index = db.data.access.findIndex(
            access => access.subject === subject
        )
        
        if (index === -1) {
            const newAccess: AccessDto = { subject, groups }
            db.data.access.push(newAccess)
            await db.write()
            return newAccess
        }
        
        db.data.access[index].groups = groups
        await db.write()
        return db.data.access[index]
    }
}

export const database = new Database()
