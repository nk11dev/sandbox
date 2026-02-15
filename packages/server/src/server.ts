import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import morgan from 'morgan'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import dotenvDefaults from 'dotenv-defaults'
import dotenvParseVariables from 'dotenv-parse-variables'
import { database } from './db/Database.js'
import { setupHttpRoutes } from './routes/api/http.routes.js'
import { setupWebSocketHandlers } from './routes/api/websocket.routes.js'
import { clientRoutes } from './routes/client.routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
const rawEnv = dotenvDefaults.config({
    path: join(__dirname, '../../../.env'),
    defaults: join(__dirname, '../../../.env.defaults'),
})
const env = dotenvParseVariables(rawEnv.parsed || {})

const PORT_SERVER = (env.PORT_SERVER as number) || 5000
const API_PATH = (env.API_PATH as string) || '/api'

/**
 * Initializes and starts the Express server with Socket.io support.
 */
async function startServer() {
    // Initialize database
    await database.initialize()

    // Create Express app
    const app = express()
    const httpServer = createServer(app)

    // Initialize Socket.io
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    })

    // Middleware
    app.use(cors({
        origin: '*',
        credentials: true,
    }))
    app.use(express.json())
    app.use(morgan('dev'))

    // Logging middleware for static files
    app.use((req, res, next) => {
        const originalSend = res.send
        res.send = function (data) {
            if (req.path.startsWith('/static') || 
                req.path.match(/\.(js|css|ico|png|jpg|svg)$/)) {
                console.log(`📦 Static: ${req.method} ${req.path}`)
            }
            return originalSend.call(this, data)
        }
        next()
    })

    // API Routes
    console.log(`\n🔌 Setting up API routes at ${API_PATH}`)
    setupHttpRoutes(app, API_PATH, io)

    // WebSocket handlers
    console.log('🔌 Setting up WebSocket handlers')
    setupWebSocketHandlers(io)

    // Serve static files from client build in production
    const clientDistPath = join(__dirname, '../../client/dist')
    app.use(express.static(clientDistPath))

    // Client routes (SPA fallback)
    clientRoutes.forEach(route => {
        app.get(route, (_req, res) => {
            res.sendFile(join(clientDistPath, 'index.html'))
        })
    })

    // 404 handler
    app.use((req, res) => {
        console.log(`⚠️  404: ${req.method} ${req.path}`)
        res.status(404).json({
            success: false,
            error: `Route not found: ${req.method} ${req.path}`,
        })
    })

    // Start server
    httpServer.listen(PORT_SERVER, () => {
        console.log(`\n🚀 Server is running on http://localhost:${PORT_SERVER}`)
        console.log(`📡 API available at http://localhost:${PORT_SERVER}${API_PATH}`)
        console.log(`🔌 WebSocket available at ws://localhost:${PORT_SERVER}\n`)
    })
}

startServer().catch(err => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
})
