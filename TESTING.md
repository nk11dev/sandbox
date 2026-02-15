# Testing Guide

## Testing Philosophy

This project follows a **layered testing approach** that mirrors the application architecture:

```
Integration Tests (E2E scenarios)
        ↑
Component Tests (UI behavior)
        ↑
State Store Tests (Business logic)
        ↑
Entity Store Tests (Data layer)
```

## Testing Principles

### 1. Test Isolation

Each layer is tested independently with mocked dependencies:

- **Entity stores** - Mock HTTP/WebSocket APIs
- **State stores** - Mock entity stores
- **Components** - Mock state objects
- **Integration** - Use real stores with mocked transport

### 2. Test What Matters

Focus on behavior, not implementation:

```typescript
// ✅ Good: Test behavior
test('creates user and shows in list', () => {
    state.createUser({ name: 'Test', email: 'test@test.com' })
    expect(state.users).toContainEqual(expect.objectContaining({ name: 'Test' }))
})

// ❌ Bad: Test implementation
test('calls httpApi.post with correct params', () => {
    // Too coupled to implementation
})
```

### 3. Avoid Over-Mocking

Mock only external dependencies, not internal logic:

```typescript
// ✅ Good: Mock external API
jest.mock('@/services/http/HttpApi')

// ❌ Bad: Mock internal stores
jest.mock('@/stores/entities/UsersEntityHttp')
// This breaks the integration you're trying to test!
```

## Test Structure

### Directory Layout

```
packages/client/src/
├── __tests__/
│   ├── testUtils.tsx              # Shared test utilities
│   └── integration/               # End-to-end scenarios
│       └── usersFlow.test.tsx
├── stores/
│   ├── entities/__tests__/       # Entity layer tests
│   │   ├── UsersEntityHttp.test.ts
│   │   └── UsersEntityWebSocket.test.ts
│   └── state/__tests__/          # State layer tests
│       └── UsersListStateHttp.test.ts
└── components/
    └── users/__tests__/          # Component layer tests
        └── UsersList.test.tsx
```

### File Naming

- Test files: `*.test.ts` or `*.test.tsx`
- Test utilities: `testUtils.ts`
- Setup files: `setupTests.ts`

## Writing Entity Store Tests

Entity stores manage data fetching and mutations. Test them with mocked APIs.

### Setup

```typescript
import { QueryClient } from '@tanstack/react-query'
import { createTestQueryClient } from '@/__tests__/testUtils'
import { httpApi, queryClient as importedQueryClient } from '@/services'
import { UsersEntityHttp } from '@/stores/entities/UsersEntityHttp'

// Mock the HTTP API
jest.mock('@/services/http/HttpApi', () => ({
    httpApi: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}))

describe('UsersEntityHttp', () => {
    let entity: UsersEntityHttp
    let queryClient: QueryClient

    beforeAll(() => {
        // Replace global queryClient with test client
        queryClient = createTestQueryClient()
        Object.assign(importedQueryClient, queryClient)
    })

    beforeEach(() => {
        entity = new UsersEntityHttp()
        jest.clearAllMocks()
    })

    afterEach(() => {
        queryClient.clear()
    })
})
```

### Test Queries

```typescript
test('fetches all users successfully', async () => {
    const mockUsers: UserDto[] = [
        { id: 1, name: 'User 1', email: 'user1@test.com' },
        { id: 2, name: 'User 2', email: 'user2@test.com' },
    ]

    ;(httpApi.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockUsers,
    })

    await entity.getAllUsersQuery.refetch()

    expect(httpApi.get).toHaveBeenCalledWith('/users')
    expect(entity.getAllUsersQuery.data).toEqual(mockUsers)
    expect(entity.getAllUsersQuery.isSuccess).toBe(true)
    expect(entity.getAllUsersQuery.isError).toBe(false)
})

test('handles fetch error', async () => {
    ;(httpApi.get as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Network error',
    })

    await entity.getAllUsersQuery.refetch()

    expect(entity.getAllUsersQuery.isError).toBe(true)
    expect(entity.getAllUsersQuery.error).toBeTruthy()
})
```

### Test Mutations

```typescript
test('creates user and updates mutation state', async () => {
    const newUser: UserDto = {
        id: 3,
        name: 'New User',
        email: 'new@test.com',
    }

    ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newUser,
    })

    await entity.createUserMutation.mutate({
        name: newUser.name,
        email: newUser.email,
    })

    expect(httpApi.post).toHaveBeenCalledWith('/users', {
        name: newUser.name,
        email: newUser.email,
    })
    
    expect(entity.createUserMutation.isSuccess).toBe(true)
    expect(entity.createUserMutation.data).toEqual(newUser)
})

test('handles mutation error', async () => {
    ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Validation failed',
    })

    await expect(
        entity.createUserMutation.mutate({
            name: '',
            email: 'invalid',
        })
    ).rejects.toThrow('Validation failed')

    expect(entity.createUserMutation.isError).toBe(true)
})
```

### Test WebSocket Event Subscriptions

```typescript
describe('WebSocket event subscriptions', () => {
    test('subscribes to all WebSocket events', () => {
        expect(webSocketApi.on).toHaveBeenCalledWith(
            'users:created',
            expect.any(Function)
        )
        expect(webSocketApi.on).toHaveBeenCalledWith(
            'users:updated',
            expect.any(Function)
        )
        expect(webSocketApi.on).toHaveBeenCalledWith(
            'users:deleted',
            expect.any(Function)
        )
    })
})
```

## Writing State Store Tests

State stores manage UI state and business logic. Test them with mocked entities.

### Setup

```typescript
import type { UserDto } from '@/common'
import type { UsersListStateHttp } from '@/stores/state/UsersListStateHttp'

// Create mock entity with getters
const createMockQuery = () => ({
    get data() { return this._data },
    get isLoading() { return this._isLoading },
    get isFetching() { return this._isFetching },
    get error() { return this._error },
    _data: undefined as UserDto[] | undefined,
    _isLoading: false,
    _isFetching: false,
    _error: null as Error | null,
    refetch: jest.fn(),
})

const mockGetAllUsersQuery = createMockQuery()

// Mock the entity
jest.mock('@/stores/entities/UsersEntityHttp', () => ({
    usersEntityHttp: {
        get getAllUsersQuery() { return mockGetAllUsersQuery },
        get createUserMutation() { return mockCreateUserMutation },
    },
}))

describe('UsersListStateHttp', () => {
    let UsersListStateHttpClass: typeof UsersListStateHttp
    let state: UsersListStateHttp

    beforeAll(async () => {
        const module = await import('@/stores/state/UsersListStateHttp')
        UsersListStateHttpClass = module.UsersListStateHttp
    })

    beforeEach(() => {
        state = new UsersListStateHttpClass()
        mockGetAllUsersQuery._data = undefined
        mockGetAllUsersQuery._isLoading = false
        jest.clearAllMocks()
    })
})
```

### Test UI State

```typescript
test('opens create modal', () => {
    state.openCreateModal()

    expect(state.isModalOpen).toBe(true)
    expect(state.editingUser).toBeNull()
    expect(state.formData).toEqual({ name: '', email: '' })
})

test('opens edit modal with user data', () => {
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

test('closes modal and resets state', () => {
    state.openCreateModal()
    state.formData.name = 'Test'
    state.closeModal()

    expect(state.isModalOpen).toBe(false)
    expect(state.editingUser).toBeNull()
    expect(state.formData).toEqual({ name: '', email: '' })
})
```

### Test Computed Properties

```typescript
test('returns users from entity', () => {
    const mockUsers: UserDto[] = [
        { id: 1, name: 'User 1', email: 'user1@test.com' },
    ]
    mockGetAllUsersQuery._data = mockUsers

    expect(state.users).toEqual(mockUsers)
})

test('returns empty array when no data', () => {
    mockGetAllUsersQuery._data = undefined

    expect(state.users).toEqual([])
})

test('computes isMutating from multiple mutations', () => {
    mockCreateUserMutation._isPending = true
    expect(state.isMutating).toBe(true)

    mockCreateUserMutation._isPending = false
    mockUpdateUserMutation._isPending = true
    expect(state.isMutating).toBe(true)
})
```

### Test Actions

```typescript
test('creates user via entity', async () => {
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

test('deletes user with confirmation', async () => {
    mockDeleteUserMutation.mutate.mockResolvedValue(undefined)
    ;(global.confirm as jest.Mock).mockReturnValue(true)

    await state.deleteUser(1)

    expect(global.confirm).toHaveBeenCalled()
    expect(mockDeleteUserMutation.mutate).toHaveBeenCalledWith(1)
})
```

## Writing Component Tests

Components are pure presentation. Test them with mocked state.

### Setup

```typescript
import { fireEvent, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { renderWithProviders } from '@/__tests__/testUtils'
import { UserDto } from '@/common'
import { IUsersListState, UsersList } from '@/components/users/UsersList'

describe('UsersList Component', () => {
    let mockState: IUsersListState

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
})
```

### Test Rendering

```typescript
test('renders title', () => {
    renderWithProviders(<UsersList state={mockState} title="Test Users" />)

    expect(screen.getByText('Test Users')).toBeInTheDocument()
})

test('renders loading state', () => {
    mockState.isLoading = true

    renderWithProviders(<UsersList state={mockState} title="Test Users" />)

    expect(screen.getByText(/loading users/i)).toBeInTheDocument()
})

test('renders user list', () => {
    const users: UserDto[] = [
        { id: 1, name: 'User 1', email: 'user1@test.com' },
        { id: 2, name: 'User 2', email: 'user2@test.com' },
    ]
    mockState.users = users

    renderWithProviders(<UsersList state={mockState} title="Test Users" />)

    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
})
```

### Test User Interactions

```typescript
test('calls refetch when button clicked', () => {
    renderWithProviders(<UsersList state={mockState} title="Test Users" />)

    const refetchButton = screen.getByText('Refetch')
    fireEvent.click(refetchButton)

    expect(mockState.refetch).toHaveBeenCalled()
})

test('calls openEditModal when Edit clicked', () => {
    const user: UserDto = {
        id: 1,
        name: 'User 1',
        email: 'user1@test.com',
    }
    mockState.users = [user]

    renderWithProviders(<UsersList state={mockState} title="Test Users" />)

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    expect(mockState.openEditModal).toHaveBeenCalledWith(user)
})
```

### Test Modal Behavior

```typescript
test('renders modal when open', () => {
    mockState.isModalOpen = true

    renderWithProviders(<UsersList state={mockState} title="Test Users" />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
})

test('calls updateFormField on input change', () => {
    mockState.isModalOpen = true
    mockState.formData = { name: '', email: '' }

    renderWithProviders(<UsersList state={mockState} title="Test Users" />)

    const nameInput = screen.getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })

    expect(mockState.updateFormField).toHaveBeenCalledWith('name', 'New Name')
})
```

## Writing Integration Tests

Integration tests verify complete flows across all layers.

### Setup

```typescript
import { QueryClient } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { createTestQueryClient, renderWithProviders } from '@/__tests__/testUtils'
import { UserDto } from '@/common'
import { UsersList } from '@/components/users/UsersList'
import { httpApi } from '@/services/http/HttpApi'
import { webSocketApi } from '@/services/websocket/WebSocketApi'
import { usersEntityHttp } from '@/stores/entities/UsersEntityHttp'
import { usersEntityWebSocket } from '@/stores/entities/UsersEntityWebSocket'
import { UsersListStateHttp } from '@/stores/state/UsersListStateHttp'
import { UsersListStateWebSocket } from '@/stores/state/UsersListStateWebSocket'

// Mock APIs only
jest.mock('@/services/http/HttpApi')
jest.mock('@/services/websocket/WebSocketApi')

describe('Users Flow Integration', () => {
    let queryClient: QueryClient
    let httpState: UsersListStateHttp
    let wsState: UsersListStateWebSocket

    beforeEach(() => {
        queryClient = createTestQueryClient()
        httpState = new UsersListStateHttp()
        wsState = new UsersListStateWebSocket()
        jest.clearAllMocks()
    })

    afterEach(() => {
        queryClient.clear()
    })
})
```

### Test Complete Scenarios

```typescript
test('creates user via HTTP and syncs to WebSocket', async () => {
    const initialUsers: UserDto[] = [
        { id: 1, name: 'User 1', email: 'user1@test.com' },
    ]

    // Mock initial fetch
    ;(httpApi.get as jest.Mock).mockResolvedValue({
        success: true,
        data: initialUsers,
    })

    // Load initial data
    await usersEntityHttp.getAllUsersQuery.refetch()

    // Render both blocks
    renderWithProviders(
        <div>
            <UsersList state={httpState} title="Users by HTTP" />
            <UsersList state={wsState} title="Users by WebSocket" />
        </div>,
        { queryClient }
    )

    // Verify initial state
    await waitFor(() => {
        expect(screen.getAllByText('User 1')).toHaveLength(2)
    })

    // Create new user
    const newUser: UserDto = {
        id: 2,
        name: 'New User',
        email: 'new@test.com',
    }

    ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newUser,
    })

    // Click create in HTTP block
    const createButtons = screen.getAllByText('Create User')
    fireEvent.click(createButtons[0])

    // Fill form
    const nameInput = screen.getByLabelText('Name')
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(nameInput, { target: { value: 'New User' } })
    fireEvent.change(emailInput, { target: { value: 'new@test.com' } })

    // Submit
    const form = document.querySelector('form')
    if (form) {
        fireEvent.submit(form)
    }

    // Verify HTTP cache updated
    await waitFor(() => {
        const cache = queryClient.getQueryData<UserDto[]>(['users', 'http'])
        expect(cache).toHaveLength(2)
        expect(cache).toContainEqual(newUser)
    })
})
```

## Test Utilities

### renderWithProviders

Wrap components with necessary providers:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import { observer } from 'mobx-react'
import { ReactElement, ReactNode } from 'react'

export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    })
}

export const TestProviders = observer(function TestProviders({
    children,
    queryClient = createTestQueryClient(),
}: {
    children: ReactNode
    queryClient?: QueryClient
}) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
})

export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'> & {
        queryClient?: QueryClient
    }
) {
    const { queryClient, ...renderOptions } = options || {}

    return render(ui, {
        wrapper: ({ children }) => (
            <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
        ...renderOptions,
    })
}
```

### waitForAsync

Wait for promises to resolve:

```typescript
export function waitForAsync(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0))
}
```

## Common Testing Patterns

### Testing Async Operations

```typescript
test('handles async operation', async () => {
    await entity.mutation.mutate(data)
    
    await waitFor(() => {
        expect(entity.mutation.isSuccess).toBe(true)
    })
})
```

### Testing Error States

```typescript
test('displays error message', () => {
    mockState.error = new Error('Test error')

    renderWithProviders(<Component state={mockState} />)

    expect(screen.getByText(/error: test error/i)).toBeInTheDocument()
})
```

### Testing Conditional Rendering

```typescript
test('shows loading spinner when loading', () => {
    mockState.isLoading = true

    const { container } = renderWithProviders(<Component state={mockState} />)

    const spinner = container.querySelector('.spinner')
    expect(spinner).toBeInTheDocument()
})
```

### Testing Button States

```typescript
test('disables buttons when mutating', () => {
    mockState.isMutating = true

    renderWithProviders(<Component state={mockState} />)

    const button = screen.getByText('Submit')
    expect(button).toBeDisabled()
})
```

## Best Practices

### 1. Clear Test Names

```typescript
// ✅ Good: Descriptive and specific
test('creates user and updates cache when mutation succeeds')

// ❌ Bad: Vague
test('it works')
```

### 2. Arrange-Act-Assert Pattern

```typescript
test('opens edit modal with user data', () => {
    // Arrange
    const user = { id: 1, name: 'Test', email: 'test@test.com' }
    
    // Act
    state.openEditModal(user)
    
    // Assert
    expect(state.isModalOpen).toBe(true)
    expect(state.editingUser).toEqual(user)
})
```

### 3. Test One Thing

```typescript
// ✅ Good: Single responsibility
test('opens modal when button clicked', () => {
    fireEvent.click(button)
    expect(state.isModalOpen).toBe(true)
})

test('loads user data when modal opens', () => {
    state.openEditModal(user)
    expect(state.formData).toEqual({ name: user.name, email: user.email })
})

// ❌ Bad: Testing too much
test('modal works correctly', () => {
    // Tests opening, loading, submitting, closing...
})
```

### 4. Avoid Implementation Details

```typescript
// ✅ Good: Test behavior
test('displays user in list after creation', () => {
    state.createUser(data)
    expect(state.users).toContainEqual(expect.objectContaining(data))
})

// ❌ Bad: Test implementation
test('calls setUsers with new array', () => {
    const spy = jest.spyOn(state, '_updateUsersArray')
    state.createUser(data)
    expect(spy).toHaveBeenCalled()
})
```

### 5. Use Testing Library Queries Properly

```typescript
// ✅ Good: Semantic queries
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email')
screen.getByText('Welcome')

// ❌ Bad: Implementation queries
screen.getByClassName('btn-submit')
container.querySelector('#email-input')
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- UsersEntityHttp.test.ts

# Run tests matching pattern
npm test -- -t "creates user"

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run in specific package
npm test --workspace=packages/client
```

## Debugging Tests

### Enable Console Logs

```typescript
test('debugs output', () => {
    screen.debug() // Print entire DOM
    screen.debug(element) // Print specific element
})
```

### Use logTestingPlaygroundURL

```typescript
import { logTestingPlaygroundURL } from '@testing-library/react'

test('helps with queries', () => {
    renderWithProviders(<Component />)
    logTestingPlaygroundURL() // Opens browser with query suggestions
})
```

### Check Query Failures

```typescript
// Shows all available queries when test fails
screen.getByRole('button', { name: /submit/i })
// Error will show all available roles and names
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Before deployments

**Required:**
- All tests must pass
- Coverage must be ≥80%
- No TypeScript errors
- No ESLint errors

## Conclusion

Follow these principles for maintainable, reliable tests:

1. **Test behavior, not implementation**
2. **Mock only external dependencies**
3. **Use semantic queries**
4. **Keep tests simple and focused**
5. **Write descriptive test names**
6. **Follow AAA pattern**
7. **Test one thing per test**

For more examples, see existing tests in the codebase.
