import { makeObservable, observable } from 'mobx'

import { ApiResponse, AccessDto, UserId } from '@/common'
import { MobxMutation, MobxQuery, queryClient, webSocketApi } from '@/services'

/**
 * Entity store for Access (user-group relationships) with WebSocket transport.
 * Manages data fetching and mutations for access matrix via Socket.io.
 * 
 * **Case 2: MobX + TanStack Query + WebSocket Integration**
 * This class demonstrates:
 * - Using MobxQuery with WebSocket as transport
 * - Using MobxMutation with WebSocket events
 * - Automatic cache invalidation on socket events (Case 6)
 * - Real-time updates for collaborative access management
 */
class AccessEntityWebSocket {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getAllAccessQuery: MobxQuery<AccessDto[], Error, AccessDto[], AccessDto[], any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getAccessBySubjectQuery: MobxQuery<AccessDto | undefined, Error, AccessDto | undefined, AccessDto | undefined, any>
    @observable updateAccessMutation: MobxMutation<AccessDto, Error, { subject: UserId; updates: Partial<Omit<AccessDto, 'subject'>> }>

    private unsubscribeUpdated?: () => void

    constructor() {
        makeObservable(this)

        // Query: Get all access records
        this.getAllAccessQuery = new MobxQuery(() => ({
            queryKey: ['access', 'websocket'] as const,
            queryFn: this.getAllAccessFn,
            staleTime: 1000 * 60 * 5, // 5 minutes
        }))

        // Query: Get access by subject (user) ID (disabled by default)
        this.getAccessBySubjectQuery = new MobxQuery(() => ({
            queryKey: ['access', 'subject', 'websocket'] as const,
            queryFn: async (): Promise<AccessDto | undefined> => undefined,
            enabled: false,
        }))

        // Mutation: Update access
        this.updateAccessMutation = new MobxMutation(() => ({
            mutationFn: this.updateAccessFn,
            onSuccess: (updatedAccess) => {
                /**
                 * **Case 5: Update cache without refetch**
                 */
                queryClient.setQueryData<AccessDto[]>(
                    ['access', 'websocket'] as const,
                    (old = []) =>
                        old.map((access) =>
                            access.subject === updatedAccess.subject 
                                ? updatedAccess 
                                : access
                        )
                )
                console.log('✓ Access updated via WebSocket:', updatedAccess.subject)
            },
        }))

        // Subscribe to real-time events
        this.subscribeToEvents()
    }

    /**
     * Subscribes to WebSocket events for automatic cache invalidation.
     * 
     * **Case 2 & 6: Real-time synchronization + Cache invalidation**
     * When ANY client modifies access, all WebSocket clients receive events
     * and update their access matrix in real-time.
     */
    private subscribeToEvents() {
        // Listen to access updated event
        this.unsubscribeUpdated = webSocketApi.on<{ subject: UserId }>(
            'access:updated',
            ({ subject }) => {
                console.log(`🔔 WebSocket event: access:updated (subject: ${subject})`)
                queryClient.invalidateQueries({ 
                    queryKey: ['access', 'websocket'],
                })
            }
        )
    }

    /**
     * Unsubscribes from WebSocket events.
     * Call this when cleaning up the store.
     */
    unsubscribeFromEvents() {
        this.unsubscribeUpdated?.()
    }

    /**
     * Fetches all access records via WebSocket.
     */
    private getAllAccessFn = async (): Promise<AccessDto[]> => {
        console.log('→ WebSocket: Fetching all access records')
        const response = await webSocketApi.emit<ApiResponse<AccessDto[]>>(
            'access:getAll'
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Fetches access by subject (user) ID via WebSocket.
     * 
     * **Case 5: Cache reading optimization**
     */
    getAccessBySubject = async (subject: UserId): Promise<AccessDto | undefined> => {
        console.log(`→ WebSocket: Fetching access for subject ${subject}`)
        
        // Try to get from cache first (Case 5)
        const cachedAccess = queryClient.getQueryData<AccessDto[]>(['access', 'websocket'])
        const cachedRecord = cachedAccess?.find((a) => a.subject === subject)
        
        if (cachedRecord) {
            console.log(`  ✓ Found in cache: subject ${subject}`)
            return cachedRecord
        }
        
        // Fetch from server if not in cache
        const response = await webSocketApi.emit<ApiResponse<AccessDto>>(
            'access:getBySubject',
            { subject }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Updates access for a subject (user) via WebSocket.
     * 
     * **Case 4: Mutation handling**
     * Demonstrates real-time collaborative access management.
     */
    private updateAccessFn = async ({
        subject,
        updates,
    }: {
        subject: UserId
        updates: Partial<Omit<AccessDto, 'subject'>>
    }): Promise<AccessDto> => {
        console.log(`→ WebSocket: Updating access for subject ${subject}`, updates)
        const response = await webSocketApi.emit<ApiResponse<AccessDto>>(
            'access:update',
            { subject, ...updates }
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }
}

export const accessEntityWebSocket = new AccessEntityWebSocket()
