/**
 * Tests for UsersList component.
 * 
 * **Case 3: Transport-Agnostic Component**
 * Tests verify:
 * - Component works with both HTTP and WebSocket states
 * - UI renders correctly based on state
 * - User interactions trigger state actions
 * - Component is truly transport-independent
 */

import { fireEvent, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { renderWithProviders } from '@/__tests__/testUtils'
import { UserDto } from '@/common'
import { UsersList } from '@/components/users/UsersList'
import { UsersListStateHttp } from '@/stores/state/UsersListStateHttp'

describe('UsersList Component', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockState: any

    beforeEach(() => {
        mockState = {
            users: [],
            isLoading: false,
            isFetching: false,
            isMutating: false,
            error: null,
            isModalOpen: false,
            editingUser: null,
            formData: { name: '', email: '' },
            openCreateModal: jest.fn(),
            openEditModal: jest.fn(),
            closeModal: jest.fn(),
            updateFormField: jest.fn(),
            submitForm: jest.fn(),
            deleteUser: jest.fn(),
            refetch: jest.fn(),
        }
    })

    describe('Rendering', () => {
        it('should render title', () => {
            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            expect(screen.getByText('Test Users')).toBeInTheDocument()
        })

        it('should render loading state', () => {
            mockState.isLoading = true

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            expect(screen.getByText(/loading users/i)).toBeInTheDocument()
        })

        it('should render error state', () => {
            mockState.error = new Error('Test error')

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            expect(screen.getByText(/error: test error/i)).toBeInTheDocument()
        })

        it('should render user list', () => {
            const users: UserDto[] = [
                { id: 1, name: 'User 1', email: 'user1@test.com' },
                { id: 2, name: 'User 2', email: 'user2@test.com' },
            ]
            mockState.users = users

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            expect(screen.getByText('User 1')).toBeInTheDocument()
            expect(screen.getByText('User 2')).toBeInTheDocument()
            expect(screen.getByText('user1@test.com')).toBeInTheDocument()
            expect(screen.getByText('user2@test.com')).toBeInTheDocument()
        })

        it('should show fetching spinner when fetching but not loading', () => {
            mockState.isFetching = true
            mockState.isLoading = false

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            // Spinner should be visible in header
            const spinners = screen.queryAllByRole('img', { hidden: true })
            expect(spinners.length).toBeGreaterThan(0)
        })
    })

    describe('User interactions', () => {
        it('should call refetch when Refetch button clicked', () => {
            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            const refetchButton = screen.getByText('Refetch')
            fireEvent.click(refetchButton)

            expect(mockState.refetch).toHaveBeenCalled()
        })

        it('should call openCreateModal when Create User button clicked', () => {
            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            const createButton = screen.getByText('Create User')
            fireEvent.click(createButton)

            expect(mockState.openCreateModal).toHaveBeenCalled()
        })

        it('should call openEditModal when Edit button clicked', () => {
            const user: UserDto = {
                id: 1,
                name: 'User 1',
                email: 'user1@test.com',
            }
            mockState.users = [user]

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            const editButtons = screen.getAllByText('Edit')
            fireEvent.click(editButtons[0])

            expect(mockState.openEditModal).toHaveBeenCalledWith(user)
        })

        it('should call deleteUser when Delete button clicked', () => {
            const user: UserDto = {
                id: 1,
                name: 'User 1',
                email: 'user1@test.com',
            }
            mockState.users = [user]

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            const deleteButtons = screen.getAllByText('Delete')
            fireEvent.click(deleteButtons[0])

            expect(mockState.deleteUser).toHaveBeenCalledWith(1)
        })

        it('should disable buttons when mutating', () => {
            mockState.isMutating = true

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            const refetchButton = screen.getByText('Refetch')
            const createButton = screen.getByText('Create User')

            expect(refetchButton).toBeDisabled()
            expect(createButton).toBeDisabled()
        })
    })

    describe('Modal', () => {
        it('should not render modal when closed', () => {
            mockState.isModalOpen = false

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })

        it('should render create modal when open', () => {
            mockState.isModalOpen = true
            mockState.editingUser = null

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            expect(screen.getByText('Create User')).toBeInTheDocument()
        })

        it('should render edit modal when open with user', () => {
            mockState.isModalOpen = true
            mockState.editingUser = {
                id: 1,
                name: 'User 1',
                email: 'user1@test.com',
            }

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            expect(screen.getByText('Edit User')).toBeInTheDocument()
        })

        it('should call updateFormField when input changes', () => {
            mockState.isModalOpen = true
            mockState.formData = { name: '', email: '' }

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            const nameInput = screen.getByLabelText('Name')
            fireEvent.change(nameInput, { target: { value: 'New Name' } })

            expect(mockState.updateFormField).toHaveBeenCalledWith(
                'name',
                'New Name'
            )
        })

        it('should call closeModal when Cancel clicked', () => {
            mockState.isModalOpen = true

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            const cancelButton = screen.getByText('Cancel')
            fireEvent.click(cancelButton)

            expect(mockState.closeModal).toHaveBeenCalled()
        })

        it('should call submitForm when form submitted', async () => {
            mockState.isModalOpen = true
            mockState.formData = { name: 'Test', email: 'test@test.com' }

            renderWithProviders(
                <UsersList state={mockState} title="Test Users" />
            )

            const form = screen.getByRole('form')
            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockState.submitForm).toHaveBeenCalled()
            })
        })
    })

    describe('Transport independence - Case 3', () => {
        it('should work with any state implementing IUsersListState interface', () => {
            // This test verifies that component only depends on interface,
            // not concrete implementation

            const mockHttpState = {
                ...mockState,
                users: [
                    { id: 1, name: 'HTTP User', email: 'http@test.com' },
                ],
            } as UsersListStateHttp

            const { rerender } = renderWithProviders(
                <UsersList state={mockHttpState} title="HTTP Users" />
            )

            expect(screen.getByText('HTTP User')).toBeInTheDocument()

            // Simulate switching to WebSocket state
            const mockWsState = {
                ...mockState,
                users: [{ id: 2, name: 'WS User', email: 'ws@test.com' }],
            } as UsersListStateHttp

            rerender(<UsersList state={mockWsState} title="WS Users" />)

            expect(screen.getByText('WS User')).toBeInTheDocument()
        })
    })
})
