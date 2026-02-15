import { io, Socket } from 'socket.io-client'

import { getWebSocketUrl } from '@/utils/env'

/**
 * Socket.io client singleton for WebSocket communication.
 * Provides a single connection instance shared across the application.
 */
class IoClient {
    private _socket: Socket | null = null

    /**
     * Gets the socket instance, creating it if necessary.
     * 
     * @returns Socket.io client instance
     */
    get socket(): Socket {
        if (!this._socket) {
            this._socket = io(getWebSocketUrl(), {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
            })

            this._socket.on('connect', () => {
                console.log('🔌 WebSocket connected:', this._socket?.id)
            })

            this._socket.on('disconnect', () => {
                console.log('🔌 WebSocket disconnected')
            })

            this._socket.on('connect_error', (error) => {
                console.error('🔌 WebSocket connection error:', error)
            })
        }

        return this._socket
    }

    /**
     * Disconnects the socket.
     */
    disconnect() {
        if (this._socket) {
            this._socket.disconnect()
            this._socket = null
        }
    }
}

export const ioClient = new IoClient()
