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
│   ├── server/          # Express + Socket.io backend
│   └── client/          # React + MobX + TanStack Query frontend
├── .env.defaults        # Default environment variables
└── package.json         # Root workspace configuration
```

## 🎯 Key Features

### Case 1: MobX + TanStack Query + HTTP
- Entity stores using `MobxQuery` for reactive data fetching
- Automatic cache updates via `MobxMutation`
- TypeScript type safety throughout the chain
- See: `UsersEntityHttp.ts`, `UsersListStateHttp.ts`

### Case 2: MobX + TanStack Query + WebSocket
- Same pattern as HTTP but with Socket.io transport
- Real-time updates via WebSocket events
- Automatic cache invalidation on events
- See: `UsersEntityWebSocket.ts`, `UsersListStateWebSocket.ts`

### Case 3: Transport-Agnostic Components
- Single `UsersList` component works with both transports
- Dependency injection via state prop
- Interface-based polymorphism
- See: `UsersList.tsx`

### Cases 4-6: Mutations and Caching
- **Case 4**: Optimistic updates with `onSuccess` callbacks
- **Case 5**: Reading from cache with `queryClient.setQueryData`
- **Case 6**: Cache invalidation with `invalidateQueries`

## 🧪 Testing the Integration

### Scenario 1: HTTP to WebSocket Sync

1. Open http://localhost:3000/users
2. Create a user via "Users by HTTP" block
3. ✅ Both blocks update automatically (HTTP mutation triggers WS event)

### Scenario 2: Real-Time Updates

1. Open http://localhost:3000/users in two browser tabs
2. Create/update/delete user in any tab
3. ✅ Changes appear in both tabs instantly

### Scenario 3: Transport Independence

1. Compare code between `UsersEntityHttp` and `UsersEntityWebSocket`
2. Compare `UsersListStateHttp` and `UsersListStateWebSocket`
3. ✅ Same patterns, different transport implementation
4. ✅ `UsersList` component is completely transport-agnostic

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
