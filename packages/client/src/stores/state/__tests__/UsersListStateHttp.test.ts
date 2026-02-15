/**
 * Tests for UsersListStateHttp.
 * 
 * Tests verify:
 * - UI state management (modals, forms)
 * - Computed properties from Entity store
 * - User interaction actions
 * - Integration with Entity layer
 */

import { UserDto } from '@/common'

// Create mock entity with getters - BEFORE importing the module that uses it
const createMockQuery = () => ({
    get data() {
        return this._data
    },
    get isLoading() {
        return this._isLoading
    },
    get isFetching() {
        return this._isFetching
    },
    get error() {
        return this._error
    },
    _data: undefined as UserDto[] | undefined,
    _isLoading: false,
    _isFetching: false,
    _error: null as Error | null,
    refetch: jest.fn(),
})

const createMockMutation = () => ({
    get isPending() {
        return this._isPending
    },
    _isPending: false,
    mutate: jest.fn(),
})

const mockGetAllUsersQuery = createMockQuery()
const mockCreateUserMutation = createMockMutation()
const mockUpdateUserMutation = createMockMutation()
const mockDeleteUserMutation = createMockMutation()

// Mock the entity
jest.mock('@/stores/entities/UsersEntityHttp', () => ({
    usersEntityHttp: {
        get getAllUsersQuery() {
            return mockGetAllUsersQuery
        },
        get createUserMutation() {
            return mockCreateUserMutation
        },
        get updateUserMutation() {
            return mockUpdateUserMutation
        },
        get deleteUserMutation() {
            return mockDeleteUserMutation
        },
    },
}))

// Import AFTER mocking
import { UsersListStateHttp } from '@/stores/state/UsersListStateHttp'

// Mock window.confirm
global.confirm = jest.fn(() => true)

describe('UsersListStateHttp', () => {
    let state: UsersListStateHttp

    beforeEach(() => {
        state = new UsersListStateHttp()
        mockGetAllUsersQuery._data = undefined
        mockGetAllUsersQuery._isLoading = false
        mockGetAllUsersQuery._isFetching = false
        mockGetAllUsersQuery._error = null
        mockCreateUserMutation._isPending = false
        mockUpdateUserMutation._isPending = false
        mockDeleteUserMutation._isPending = false
        jest.clearAllMocks()
    })

    describe('UI state management', () => {
        it('should initialize with default values', () => {
            expect(state.isModalOpen).toBe(false)
            expect(state.editingUser).toBeNull()
            expect(state.formData).toEqual({ name: '', email: '' })
        })

        it('should open create modal', () => {
            state.openCreateModal()

            expect(state.isModalOpen).toBe(true)
            expect(state.editingUser).toBeNull()
            expect(state.formData).toEqual({ name: '', email: '' })
        })

        it('should open edit modal with user data', () => {
            const user: UserDto = {
                id: 1,
                name: 'Test User',
                email: 'test@test.com',
            }

            state.openEditModal(user)

            expect(state.isModalOpen).toBe(true)
            expect(state.editingUser).toEqual(user)
            expect(state.formData).toEqual({
                name: user.name,
                email: user.email,
            })
        })

        it('should close modal and reset state', () => {
            state.openCreateModal()
            state.formData.name = 'Test'
            state.closeModal()

            expect(state.isModalOpen).toBe(false)
            expect(state.editingUser).toBeNull()
            expect(state.formData).toEqual({ name: '', email: '' })
        })

        it('should update form field', () => {
            state.updateFormField('name', 'New Name')
            expect(state.formData.name).toBe('New Name')

            state.updateFormField('email', 'new@test.com')
            expect(state.formData.email).toBe('new@test.com')
        })
    })

    describe('Computed properties', () => {
        it('should return users from entity', () => {
            const mockUsers: UserDto[] = [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
            ]
            mockGetAllUsersQuery._data = mockUsers

            expect(state.users).toEqual(mockUsers)
        })

        it('should return empty array when no data', () => {
            mockGetAllUsersQuery._data = undefined

            expect(state.users).toEqual([])
        })

        it('should return loading state', () => {
            mockGetAllUsersQuery._isLoading = true
            expect(state.isLoading).toBe(true)

            mockGetAllUsersQuery._isLoading = false
            expect(state.isLoading).toBe(false)
        })

        it('should return fetching state', () => {
            mockGetAllUsersQuery._isFetching = true
            expect(state.isFetching).toBe(true)

            mockGetAllUsersQuery._isFetching = false
            expect(state.isFetching).toBe(false)
        })

        it('should return error state', () => {
            const error = new Error('Test error')
            mockGetAllUsersQuery._error = error
            expect(state.error).toBe(error)
        })

        it('should return mutating state when any mutation is pending', () => {
            mockCreateUserMutation._isPending = true
            expect(state.isMutating).toBe(true)

            mockCreateUserMutation._isPending = false
            mockUpdateUserMutation._isPending = true
            expect(state.isMutating).toBe(true)

            mockUpdateUserMutation._isPending = false
            mockDeleteUserMutation._isPending = true
            expect(state.isMutating).toBe(true)

            mockDeleteUserMutation._isPending = false
            expect(state.isMutating).toBe(false)
        })
    })

    describe('Actions', () => {
        it('should create user', async () => {
            mockCreateUserMutation.mutate.mockResolvedValue(undefined)

            await state.createUser({
                name: 'New User',
                email: 'new@test.com',
            })

            expect(mockCreateUserMutation.mutate).toHaveBeenCalledWith({
                name: 'New User',
                email: 'new@test.com',
            })
        })

        it('should update user', async () => {
            mockUpdateUserMutation.mutate.mockResolvedValue(undefined)

            await state.updateUser(1, { name: 'Updated Name' })

            expect(mockUpdateUserMutation.mutate).toHaveBeenCalledWith({
                id: 1,
                updates: { name: 'Updated Name' },
            })
        })

        it('should delete user with confirmation', async () => {
            mockDeleteUserMutation.mutate.mockResolvedValue(undefined)
            ;(global.confirm as jest.Mock).mockReturnValue(true)

            await state.deleteUser(1)

            expect(global.confirm).toHaveBeenCalled()
            expect(mockDeleteUserMutation.mutate).toHaveBeenCalledWith(1)
        })

        it('should not delete user if not confirmed', async () => {
            ;(global.confirm as jest.Mock).mockReturnValue(false)

            await state.deleteUser(1)

            expect(global.confirm).toHaveBeenCalled()
            expect(mockDeleteUserMutation.mutate).not.toHaveBeenCalled()
        })

        it('should refetch users', () => {
            state.refetch()

            expect(mockGetAllUsersQuery.refetch).toHaveBeenCalled()
        })

        it('should submit form for creating user', async () => {
            mockCreateUserMutation.mutate.mockResolvedValue(undefined)

            state.openCreateModal()
            state.formData.name = 'Test User'
            state.formData.email = 'test@test.com'

            await state.submitForm()

            expect(mockCreateUserMutation.mutate).toHaveBeenCalledWith({
                name: 'Test User',
                email: 'test@test.com',
            })
            expect(state.isModalOpen).toBe(false)
        })

        it('should submit form for updating user', async () => {
            mockUpdateUserMutation.mutate.mockResolvedValue(undefined)

            const user: UserDto = {
                id: 1,
                name: 'Old Name',
                email: 'old@test.com',
            }
            state.openEditModal(user)
            state.formData.name = 'New Name'

            await state.submitForm()

            expect(mockUpdateUserMutation.mutate).toHaveBeenCalledWith({
                id: 1,
                updates: { name: 'New Name', email: 'old@test.com' },
            })
            expect(state.isModalOpen).toBe(false)
        })
    })
})
