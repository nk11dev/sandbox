import { ioClient } from './IoClient'

/**
 * WebSocket API service for making requests via Socket.io.
 * Provides Promise-based methods that wrap socket.emit with acknowledgments.
 */
class WebSocketApi {
    /**
     * Emits an event and waits for acknowledgment.
     * 
     * @param event - Event name (e.g., 'users:getAll')
     * @param data - Optional data to send with event
     * @returns Promise with acknowledgment response
     */
    async emit<T>(event: string, data?: unknown): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`WebSocket timeout for event: ${event}`))
            }, 10000) // 10 second timeout

            // Socket.io требует разные сигнатуры в зависимости от наличия data
            if (data !== undefined) {
                ioClient.socket.emit(event, data, (response: T) => {
                    clearTimeout(timeout)
                    resolve(response)
                })
            } else {
                ioClient.socket.emit(event, (response: T) => {
                    clearTimeout(timeout)
                    resolve(response)
                })
            }
        })
    }

    /**
     * Subscribes to an event.
     * 
     * @param event - Event name to listen to
     * @param callback - Callback function to handle event
     * @returns Cleanup function to unsubscribe
     */
    on<T>(event: string, callback: (data: T) => void): () => void {
        ioClient.socket.on(event, callback)
        
        return () => {
            ioClient.socket.off(event, callback)
        }
    }

    /**
     * Unsubscribes from an event.
     * 
     * @param event - Event name to stop listening to
     * @param callback - Optional specific callback to remove
     */
    off(event: string, callback?: (...args: unknown[]) => void) {
        if (callback) {
            ioClient.socket.off(event, callback)
        } else {
            ioClient.socket.off(event)
        }
    }
}

export const webSocketApi = new WebSocketApi()
