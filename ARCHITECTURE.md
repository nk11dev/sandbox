

# Architecture Documentation

## MobX + TanStack Query Integration

This document describes the architectural patterns used to integrate MobX with TanStack Query for both HTTP and WebSocket transports.

## Core Concepts

### 1. MobxQuery Wrapper

`MobxQuery` is a wrapper around TanStack Query's `QueryObserver` that makes queries reactive to MobX.

**Key Features:**
- Uses MobX `atom` for reactivity tracking
- Subscribes to query observer changes
- Automatically tracks when accessed in MobX reactions
- Supports Suspense by throwing promises

**Usage Example:**

```typescript
class UsersEntityHttp {
    @observable getAllUsersQuery: MobxQuery<UserDto[]>

    constructor() {
        this.getAllUsersQuery = new MobxQuery(() => ({
            queryKey: ['users', 'http'],
            queryFn: this.getAllUsersFn,
            staleTime: 1000 * 60 * 5,
        }))
    }

    private getAllUsersFn = async (): Promise<UserDto[]> => {
        const response = await httpApi.get('/users')
        return response.data
    }
}
```

### 2. MobxMutation Wrapper

`MobxMutation` wraps TanStack Query's `MutationObserver` for reactive mutations.

**Key Features:**
- Reactive mutation state (isPending, isSuccess, error)
- Supports optimistic updates
- Cache manipulation via `onSuccess`
- Type-safe mutation variables

**Usage Example:**

```typescript
this.createUserMutation = new MobxMutation(() => ({
    mutationFn: this.createUserFn,
    onSuccess: (newUser) => {
        // Update cache immediately
        queryClient.setQueryData(['users', 'http'], (old = []) => 
            [...old, newUser]
        )
    },
}))
```

### 3. Three-Layer Architecture

```
┌─────────────────────────────────────┐
│   React Component (Presentation)    │
│   - UsersList.tsx                   │
│   - Uses observer() HOC             │
│   - Receives state via props        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   State Store (Business Logic)      │
│   - UsersListStateHttp.ts           │
│   - UI state (modals, forms)        │
│   - Computed properties             │
│   - Actions for user interactions   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Entity Store (Data Layer)         │
│   - UsersEntityHttp.ts              │
│   - MobxQuery for queries           │
│   - MobxMutation for mutations      │
│   - Single source of truth          │
└─────────────────────────────────────┘
```

## Transport Implementations

### HTTP Transport

```typescript
// Entity: Uses fetch via httpApi
private getAllUsersFn = async (): Promise<UserDto[]> => {
    const response = await httpApi.get<ApiResponse<UserDto[]>>('/users')
    if (!response.success) throw new Error(response.error)
    return response.data
}
```

**Mutation Flow:**
1. User clicks "Create" → `state.createUser()`
2. State calls `entity.createUserMutation.mutate()`
3. HTTP request via `httpApi.post()`
4. `onSuccess` updates cache via `queryClient.setQueryData()`
5. Server emits WebSocket event for other clients
6. Component re-renders with new data

### WebSocket Transport

```typescript
// Entity: Uses socket.io via webSocketApi
private getAllUsersFn = async (): Promise<UserDto[]> => {
    const response = await webSocketApi.emit<ApiResponse<UserDto[]>>(
        'users:getAll'
    )
    if (!response.success) throw new Error(response.error)
    return response.data
}

// Subscribe to real-time events
constructor() {
    webSocketApi.on('users:created', () => {
        queryClient.invalidateQueries(['users', 'websocket'])
    })
}
```

**Real-Time Flow:**
1. Any client mutates data (HTTP or WebSocket)
2. Server broadcasts event to all connected clients
3. Event listener invalidates cache
4. TanStack Query refetches data automatically
5. MobX triggers component re-render

## Key Integration Cases

### Case 1: HTTP Entity + State

**Demonstrates:**
- REST API integration
- Cache updates after mutations
- Type-safe request/response handling

**Implemented in:**
- `UsersEntityHttp.ts` + `UsersListStateHttp.ts`
- `RolesEntityHttp.ts` + `RolesListStateHttp.ts`
- `GroupsEntityHttp.ts` + `GroupsPageState.ts`
- `AccessEntityHttp.ts` + `GroupsPageState.ts`

### Case 2: WebSocket Entity + State

**Demonstrates:**
- Socket.io integration with TanStack Query
- Real-time updates via event listeners
- Automatic cache invalidation

**Implemented in:**
- `UsersEntityWebSocket.ts` + `UsersListStateWebSocket.ts`
- `RolesEntityWebSocket.ts` + `RolesListStateWebSocket.ts`
- `GroupsEntityWebSocket.ts` (ready for use)
- `AccessEntityWebSocket.ts` (ready for use)

### Case 3: Universal Component

**Demonstrates:**
- Transport-agnostic components via interfaces
- Dependency injection pattern
- Single component for multiple transports

**Implemented in:**
- `UsersList.tsx` - Works with both HTTP and WebSocket states
- `RolesList.tsx` - Works with both HTTP and WebSocket states

**Interface Example:**

```typescript
interface IUsersListState {
    users: UserDto[]
    isLoading: boolean
    isFetching: boolean
    // ... methods
}
```

**Usage:**

```typescript
// Works with HTTP
<UsersList state={httpState} title="Users by HTTP" />

// Works with WebSocket
<UsersList state={wsState} title="Users by WebSocket" />
```

### Case 4: Optimistic Updates

**Pattern: Update cache before server response**

```typescript
onMutate: async (newUser) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['users'])
    
    // Snapshot previous value
    const previous = queryClient.getQueryData<UserDto[]>(['users'])
    
    // Optimistically update
    queryClient.setQueryData<UserDto[]>(['users'], (old = []) => 
        [...old, { ...newUser, id: Date.now() }]
    )
    
    return { previous }
},
onError: (err, newUser, context) => {
    // Rollback on error
    if (context?.previous) {
        queryClient.setQueryData(['users'], context.previous)
    }
},
```

### Case 5: Cache Reading

**Pattern: Read from cache to avoid duplicate requests**

```typescript
// Get user from cache instead of new request
const cachedUser = queryClient.getQueryData<UserDto[]>(['users', 'http'])
    ?.find(u => u.id === userId)
    
if (cachedUser) {
    // Use cached data
    return cachedUser
}

// Fetch if not in cache
return await getUserFn(userId)
```

### Case 6: Cache Invalidation

**Pattern: Invalidate related queries after mutations**

```typescript
// After creating user, invalidate all user-related queries
onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['access'] }) // Related data
}

// WebSocket events also trigger invalidation
socket.on('users:created', () => {
    queryClient.invalidateQueries({ queryKey: ['users', 'websocket'] })
})
```

**Advanced Example: Cross-Entity Invalidation**

Demonstrated in `GroupsEntityHttp.ts`:
```typescript
// When a group is deleted, access matrix must update
deleteGroupMutation: new MobxMutation(() => ({
    mutationFn: this.deleteGroupFn,
    onSuccess: (data) => {
        // Update groups cache
        queryClient.setQueryData<GroupDto[]>(['groups', 'http'], ...)
        
        // Invalidate access matrix (Case 6)
        queryClient.invalidateQueries({ queryKey: ['access'] })
    },
}))
```

When roles are modified, groups that reference those roles automatically
update via cache invalidation chain.

## Advanced Integration Patterns

### Multi-Entity State Management

**Demonstrated in:** `GroupsPageState.ts`

The Groups page combines multiple entity stores:
- `groupsEntityHttp` - Groups CRUD
- `accessEntityHttp` - Access matrix
- `usersEntityHttp` - User list for matrix
- `rolesEntityHttp` - Roles for multiselect

```typescript
export class GroupsPageState {
    @computed get groups(): GroupDto[] {
        return groupsEntityHttp.getAllGroupsQuery.data || []
    }
    
    @computed get users(): UserDto[] {
        return usersEntityHttp.getAllUsersQuery.data || []
    }
    
    @computed get accessRecords(): AccessDto[] {
        return accessEntityHttp.getAllAccessQuery.data || []
    }
}
```

### Cache-First Data Loading

**Demonstrated in:** `GroupsEntityHttp.getGroupById()`

Before making a server request, check cache first:

```typescript
getGroupById = async (id: GroupId): Promise<GroupDto | undefined> => {
    // Try cache first (Case 5)
    const cachedGroups = queryClient.getQueryData<GroupDto[]>(['groups', 'http'])
    const cachedGroup = cachedGroups?.find((g) => g.id === id)
    
    if (cachedGroup) {
        console.log(`✓ Found in cache: ${id}`)
        return cachedGroup
    }
    
    // Fetch from server only if not cached
    const response = await httpApi.get<ApiResponse<GroupDto>>(`/groups/${id}`)
    return response.data
}
```

### Real-Time Search Without Requests

**Demonstrated in:** `GroupsPageState.filteredUsers`

Search is implemented using computed properties on cached data:

```typescript
@computed get filteredUsers(): UserDto[] {
    if (!this.searchQuery.trim()) {
        return this.users // All data from cache
    }
    
    const terms = this.searchQuery.toLowerCase().split(' ').filter((t) => t.length > 0)
    
    return this.users.filter((user) => {
        const userName = user.name.toLowerCase()
        const userEmail = user.email.toLowerCase()
        
        return terms.every((term) => userName.includes(term) || userEmail.includes(term))
    })
}
```

No API calls needed - instant filtering!

### Cross-Entity Cache Invalidation

**Demonstrated in:** Role/Group relationship

When roles are modified, groups automatically update:

```typescript
// In RolesEntityHttp
deleteRoleMutation: new MobxMutation(() => ({
    mutationFn: this.deleteRoleFn,
    onSuccess: (data) => {
        // Update roles cache
        queryClient.setQueryData<RoleDto[]>(['roles', 'http'], ...)
        
        // Invalidate groups (Case 6)
        queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
}))
```

Similarly, when groups are modified, access matrix updates:

```typescript
// In GroupsEntityHttp
deleteGroupMutation: new MobxMutation(() => ({
    mutationFn: this.deleteGroupFn,
    onSuccess: (data) => {
        // Update groups cache
        queryClient.setQueryData<GroupDto[]>(['groups', 'http'], ...)
        
        // Invalidate access (Case 6)
        queryClient.invalidateQueries({ queryKey: ['access'] })
    },
}))
```

**Dependency Chain:**
```
Roles → Groups → Access
  ↓       ↓        ↓
Cache invalidation propagates automatically
```

### Collaborative Access Matrix

**Demonstrated in:** `GroupsAccess.tsx` + `GroupsPageState.ts`

Real-time collaborative editing:

1. User A toggles access checkbox
2. Mutation updates cache immediately (Case 5)
3. Server broadcasts WebSocket event
4. User B's access matrix updates automatically (Case 2 + 6)

```typescript
@action async toggleAccess(userId: UserId, groupId: GroupId) {
    const access = this.accessRecords.find((a) => a.subject === userId)
    
    const hasAccess = access.groups.includes(groupId)
    const updatedGroups = hasAccess
        ? access.groups.filter((g) => g !== groupId)
        : [...access.groups, groupId]
    
    // Mutation with immediate cache update
    await accessEntityHttp.updateAccessMutation.mutate({
        subject: userId,
        updates: { groups: updatedGroups },
    })
}
```

## Best Practices

### 1. Query Keys

Use hierarchical keys for easy invalidation:

```typescript
['users']                    // All users queries
['users', 'http']            // HTTP-specific
['users', 'websocket']       // WebSocket-specific
['users', 'http', id]        // Specific user
```

### 2. Error Handling

Always handle errors in query/mutation functions:

```typescript
if (!response.success) {
    throw new Error(response.error)
}
```

### 3. TypeScript Types

Use strict types from common package:

```typescript
import { UserDto, ApiResponse } from '@/common'

async getAllUsers(): Promise<UserDto[]> {
    const response = await api.get<ApiResponse<UserDto[]>>('/users')
    return response.data
}
```

### 4. MobX Decorators

Use decorators for observable state:

```typescript
@observable getAllUsersQuery: MobxQuery<UserDto[]>
@computed get users(): UserDto[] { ... }
@action createUser(data) { ... }
```

### 5. Component Patterns

Keep components dumb, state in stores:

```typescript
// ❌ Bad: Logic in component
function UsersList() {
    const [users, setUsers] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    // ... lots of logic
}

// ✅ Good: Logic in store
function UsersList({ state }: { state: IUsersListState }) {
    return observer(() => (
        <div>
            {state.users.map(user => ...)}
        </div>
    ))
}
```

## Performance Considerations

### 1. Stale Time

Set appropriate stale times to reduce unnecessary fetches:

```typescript
staleTime: 1000 * 60 * 5 // 5 minutes
```

### 2. Cache Time

Control how long unused data stays in cache:

```typescript
gcTime: 1000 * 60 * 10 // 10 minutes
```

### 3. Selective Invalidation

Invalidate only what's needed:

```typescript
// ✅ Good: Specific invalidation
queryClient.invalidateQueries({ queryKey: ['users', transport] })

// ❌ Bad: Invalidate everything
queryClient.invalidateQueries()
```

### 4. MobX Reactivity

Access observables only in render or reactions:

```typescript
// ✅ Good: In observer component
export const UsersList = observer(({ state }) => {
    return <div>{state.users.length}</div>
})

// ❌ Bad: Outside observer
const count = state.users.length // Not reactive!
```

## Testing Strategies

### 1. Entity Store Tests

Test query and mutation functions independently:

```typescript
test('creates user successfully', async () => {
    const entity = new UsersEntityHttp()
    await entity.createUserMutation.mutate({ name: 'Test', email: 'test@test.com' })
    expect(entity.createUserMutation.isSuccess).toBe(true)
})
```

### 2. State Store Tests

Test business logic and UI state:

```typescript
test('opens create modal', () => {
    const state = new UsersListStateHttp()
    state.openCreateModal()
    expect(state.isModalOpen).toBe(true)
    expect(state.editingUser).toBeNull()
})
```

### 3. Component Tests

Test with mocked state:

```typescript
test('renders user list', () => {
    const mockState = {
        users: [{ id: 1, name: 'Test', email: 'test@test.com' }],
        isLoading: false,
        // ... other required properties
    }
    render(<UsersList state={mockState} title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
})
```

## Debugging Tips

### 1. Enable React Query Devtools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools />
</QueryClientProvider>
```

### 2. Log Query/Mutation Events

```typescript
console.log('→ HTTP: Fetching users')
console.log('✓ User created:', userId)
console.log('🔔 WebSocket event: users:created')
```

### 3. Monitor WebSocket Events

```typescript
socket.on('connect', () => console.log('🔌 Connected:', socket.id))
socket.on('disconnect', () => console.log('🔌 Disconnected'))
```

### 4. MobX Spy

```typescript
import { spy } from 'mobx'

spy(event => {
    if (event.type === 'action') {
        console.log('Action:', event.name)
    }
})
```

## Migration Guide

### From Plain HTTP to This Architecture

1. **Extract API calls to Entity stores**
   - Move fetch logic to Entity methods
   - Wrap with MobxQuery/MobxMutation

2. **Move UI state to State stores**
   - Modal state, form state, selections
   - Computed properties for derived data

3. **Make components observers**
   - Wrap with `observer()` HOC
   - Remove useState/useEffect for server data

4. **Add TypeScript types**
   - Use common types for DTOs
   - Type all query/mutation functions

### From Redux to MobX + TanStack Query

1. **Replace Redux slices with Entity stores**
   - Actions → Mutation functions
   - Reducers → MobX observables
   - Selectors → Computed properties

2. **Move async logic to TanStack Query**
   - Redux Thunks → MobxQuery/MobxMutation
   - Middleware → Query/Mutation callbacks

3. **Simplify component connections**
   - Remove connect() → Use observer()
   - Remove mapStateToProps → Use computed
   - Remove mapDispatchToProps → Use actions

## Conclusion

This architecture provides:

✅ Type-safe integration between MobX and TanStack Query  
✅ Support for multiple transports (HTTP, WebSocket)  
✅ Real-time synchronization across clients  
✅ Separation of concerns (Entity/State/Component)  
✅ Easy testing and maintainability  
✅ Excellent developer experience  

For questions or improvements, see the code examples in the codebase.
