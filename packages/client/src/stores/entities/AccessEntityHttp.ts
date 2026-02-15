import { makeObservable, observable } from 'mobx'

import { AccessDto, UserId, ApiResponse } from '@/common'
import { httpApi, MobxMutation, MobxQuery, queryClient } from '@/services'

/**
 * Entity store for Access (user-group relationships) with HTTP transport.
 * Manages data fetching and mutations for access matrix via REST API.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * This class demonstrates:
 * - Using MobxQuery for reactive data fetching
 * - Using MobxMutation for reactive mutations
 * - Cache updates after mutations (Case 5)
 * - Complex data relationships (users ↔ groups)
 */
class AccessEntityHttp {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getAllAccessQuery: MobxQuery<AccessDto[], Error, AccessDto[], AccessDto[], any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @observable getAccessBySubjectQuery: MobxQuery<AccessDto | undefined, Error, AccessDto | undefined, AccessDto | undefined, any>
    @observable updateAccessMutation: MobxMutation<AccessDto, Error, { subject: UserId; updates: Partial<Omit<AccessDto, 'subject'>> }>

    constructor() {
        makeObservable(this)

        // Query: Get all access records
        this.getAllAccessQuery = new MobxQuery(() => ({
            queryKey: ['access', 'http'] as const,
            queryFn: this.getAllAccessFn,
            staleTime: 1000 * 60 * 5, // 5 minutes
        }))

        // Query: Get access by subject (user) ID (disabled by default)
        this.getAccessBySubjectQuery = new MobxQuery(() => ({
            queryKey: ['access', 'subject', 'http'] as const,
            queryFn: async (): Promise<AccessDto | undefined> => undefined,
            enabled: false,
        }))

        // Mutation: Update access
        this.updateAccessMutation = new MobxMutation(() => ({
            mutationFn: this.updateAccessFn,
            onSuccess: (updatedAccess) => {
                /**
                 * **Case 5: Update cache without refetch**
                 * This is critical for the access matrix UI to update instantly.
                 */
                queryClient.setQueryData<AccessDto[]>(
                    ['access', 'http'] as const,
                    (old = []) =>
                        old.map((access) =>
                            access.subject === updatedAccess.subject 
                                ? updatedAccess 
                                : access
                        )
                )
                console.log('✓ Access updated via HTTP:', updatedAccess.subject)
            },
        }))
    }

    /**
     * Fetches all access records from HTTP API.
     */
    private getAllAccessFn = async (): Promise<AccessDto[]> => {
        console.log('→ HTTP: Fetching all access records')
        const response = await httpApi.get<ApiResponse<AccessDto[]>>('/access')
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Fetches access by subject (user) ID from HTTP API.
     * 
     * **Case 5: Cache reading optimization**
     * Try to find in cache before making a request.
     */
    getAccessBySubject = async (subject: UserId): Promise<AccessDto | undefined> => {
        console.log(`→ HTTP: Fetching access for subject ${subject}`)
        
        // Try to get from cache first (Case 5)
        const cachedAccess = queryClient.getQueryData<AccessDto[]>(['access', 'http'])
        const cachedRecord = cachedAccess?.find((a) => a.subject === subject)
        
        if (cachedRecord) {
            console.log(`  ✓ Found in cache: subject ${subject}`)
            return cachedRecord
        }
        
        // Fetch from server if not in cache
        const response = await httpApi.get<ApiResponse<AccessDto>>(
            `/access/${subject}`
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }

    /**
     * Updates access for a subject (user) via HTTP API.
     * 
     * **Case 4: Mutation handling**
     * Demonstrates updating many-to-many relationship (user ↔ groups).
     */
    private updateAccessFn = async ({
        subject,
        updates,
    }: {
        subject: UserId
        updates: Partial<Omit<AccessDto, 'subject'>>
    }): Promise<AccessDto> => {
        console.log(`→ HTTP: Updating access for subject ${subject}`, updates)
        const response = await httpApi.put<ApiResponse<AccessDto>>(
            `/access/${subject}`,
            updates
        )
        
        if (!response.success) {
            throw new Error(response.error)
        }
        
        return response.data
    }
}

export const accessEntityHttp = new AccessEntityHttp()
