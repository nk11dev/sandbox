# Sandbox - MobX + TanStack Query Integration

Fullstack sandbox project demonstrating the integration of **MobX** and **TanStack Query** with support for both **HTTP** and **WebSocket** transports.

## 🚀 Quick Start

### Installation

```bash
# Install all dependencies for all packages
npm run install:all
```

### Development

```bash
# Terminal 1: Start server (development mode)
npm run dev:server

# Terminal 2: Start client (development mode)
npm run dev:client
```

- Server: http://localhost:5000
- Client: http://localhost:3000
- API: http://localhost:5000/api

### Production Build

```bash
# Build and run in production mode
npm run prod
```

Server will serve both API and static client files at http://localhost:5000

## 📁 Project Structure

```
sandbox/
├── packages/
│   ├── common/          # Shared types and utilities
│   │   ├── types/       # UserDto, RoleDto, GroupDto, AccessDto
│   │   └── utils/       # ApiResponse type
│   ├── server/          # Express + Socket.io backend
│   │   ├── controllers/ # CRUD handlers for all entities
│   │   ├── db/          # LowDB with JSON storage
│   │   └── routes/      # HTTP REST + WebSocket handlers
│   └── client/          # React + MobX + TanStack Query frontend
│       ├── services/    # HttpApi, WebSocketApi, MobxQuery, MobxMutation
│       ├── stores/      # Entity and State stores
│       │   ├── entities/  # Data layer (Users, Roles, Groups, Access)
│       │   └── state/     # Business logic layer
│       └── components/  # React UI components
│           ├── users/     # Users page (HTTP + WebSocket)
│           ├── roles/     # Roles page (HTTP + WebSocket)
│           ├── groups/    # Groups catalog + Access matrix
│           └── layout/    # Header, Footer, Breadcrumbs
├── .env.defaults        # Default environment variables
└── package.json         # Root workspace configuration
```

## 📄 Implemented Pages

### Users Page (`/users`)
- Side-by-side HTTP and WebSocket implementations
- CRUD operations for users
- Real-time sync between both blocks
- **Demonstrates:** Cases 1, 2, 3, 4, 5, 6

### Roles Page (`/roles`)
- Side-by-side HTTP and WebSocket implementations
- CRUD operations for roles
- Real-time sync between both blocks
- Cross-entity invalidation (roles → groups)
- **Demonstrates:** Cases 1, 2, 3, 4, 5, 6

### Groups Page (`/groups`)
- **Groups Catalog:** CRUD with role multiselect
- **Access Matrix:** User-group permissions with checkboxes
- Real-time search filtering (cache-based, no API calls)
- Automatic updates when groups/users change
- **Demonstrates:** All cases + advanced patterns

### Group Profile Page (`/groups/:id`)
- Edit single group with role multiselect
- Cache-first data loading
- Unsaved changes detection
- **Demonstrates:** Cases 1, 4, 5

## 🎯 Key Features

### Case 1: MobX + TanStack Query + HTTP
- Entity stores using `MobxQuery` for reactive data fetching
- Automatic cache updates via `MobxMutation`
- TypeScript type safety throughout the chain
- **Implemented in:** Users, Roles, Groups, Access entities

### Case 2: MobX + TanStack Query + WebSocket
- Same pattern as HTTP but with Socket.io transport
- Real-time updates via WebSocket events
- Automatic cache invalidation on events
- **Implemented in:** Users, Roles entities (Groups and Access ready)

### Case 3: Transport-Agnostic Components
- Single component works with both HTTP and WebSocket
- Dependency injection via state prop
- Interface-based polymorphism
- **Implemented in:** `UsersList.tsx`, `RolesList.tsx`

### Cases 4-6: Mutations and Caching
- **Case 4**: Optimistic updates with `onSuccess` callbacks
- **Case 5**: Reading from cache without additional requests
- **Case 6**: Cross-entity cache invalidation chains

### Advanced Patterns
- **Multi-Entity State**: `GroupsPageState` combines 4 entity stores
- **Cache-First Loading**: Check cache before server requests
- **Real-Time Search**: Filter cached data without API calls
- **Collaborative Editing**: Access matrix with real-time sync
- **Cross-Entity Dependencies**: Roles → Groups → Access invalidation chain

## 🧪 Testing the Integration

### Scenario 1: HTTP to WebSocket Sync

**Page:** Users or Roles
1. Open page in browser
2. Create item via "HTTP" block
3. ✅ Both HTTP and WebSocket blocks update automatically

### Scenario 2: Real-Time Updates

**Page:** Users or Roles
1. Open page in two browser tabs
2. Create/update/delete item in any tab
3. ✅ Changes appear in both tabs instantly

### Scenario 3: Transport Independence

**Implementation:**
1. Compare `UsersEntityHttp` vs `UsersEntityWebSocket`
2. Compare `UsersListStateHttp` vs `UsersListStateWebSocket`
3. ✅ Same patterns, different transport
4. ✅ `UsersList` component is transport-agnostic

### Scenario 4: Cross-Entity Cache Invalidation

**Page:** Groups
1. Create a role on Roles page
2. Go to Groups page → Create group with that role
3. Delete the role on Roles page
4. ✅ Groups page automatically refetches (cache invalidation)

### Scenario 5: Cache-First Loading

**Page:** Group Profile
1. Visit Groups page (groups cached)
2. Click on group name to open profile
3. ✅ Group data loads instantly from cache
4. Check console logs for "Found in cache" message

### Scenario 6: Real-Time Search Without Requests

**Page:** Groups (Access Matrix)
1. Type user name in search field
2. ✅ Matrix filters instantly without API calls
3. Clear search
4. ✅ Full matrix appears instantly (from cache)

### Scenario 7: Collaborative Access Matrix

**Page:** Groups (Access Matrix)
1. Open Groups page in two browser tabs
2. Toggle access checkbox in first tab
3. ✅ Second tab updates automatically in real-time
4. Check console for WebSocket events

### Scenario 8: Multi-Entity State Management

**Page:** Groups
1. Create/delete groups in catalog (top)
2. ✅ Access matrix (bottom) columns update automatically
3. Create/delete users on Users page
4. ✅ Access matrix rows update automatically

## 📚 Architecture

### Entity Layer
- Manages data fetching and mutations
- Uses `MobxQuery` and `MobxMutation` wrappers
- Single source of truth for each entity
- Transport-specific (HTTP or WebSocket)

### State Layer
- Manages UI state (modals, forms, selections)
- Uses Entity stores for data access
- Exposes computed properties to components
- Contains business logic

### Component Layer
- Pure React components with MobX observer
- Receives state via props (dependency injection)
- Transport-agnostic when using interfaces
- Focuses on presentation

## 🔧 Available Scripts

```bash
npm run dev:client      # Start client dev server
npm run dev:server      # Start server dev server
npm run build           # Build client and server
npm run build:client    # Build client only
npm run build:server    # Build server only
npm run start           # Start production server
npm run prod            # Build and start production
npm run lint            # Lint all packages
npm run lint:fix        # Lint and fix all packages
npm run ts:check        # TypeScript check all packages
```

## 🌐 Environment Variables

See `.env.defaults` for available variables:

```env
PORT_CLIENT=3000
PORT_SERVER=5000
API_HOST=
API_PATH=/api
```

Create `.env` file to override defaults.

## 🛠️ Tech Stack

### Frontend
- React 18.2.0
- MobX 6.12.0
- TanStack Query 5.90.16
- Socket.io Client 4.8.1
- Vite 5.4.19
- TypeScript 5.4.2

### Backend
- Express 4.18.2
- Socket.io 4.8.1
- LowDB 7.0.1
- TypeScript 5.4.2

## 📖 Documentation

For detailed architecture and implementation details, see:
- `ARCHITECTURE.md` - Integration patterns and best practices
- Code comments in Entity and State stores
- Component JSDoc documentation

## 🎨 Code Style

- 4-space indentation
- No semicolons
- Single quotes
- Max line length: 100 characters
- ESLint + TypeScript strict mode

## 📝 License

MIT
