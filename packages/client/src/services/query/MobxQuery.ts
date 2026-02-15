import {
    DefaultError,
    QueryKey,
    QueryObserver,
    QueryObserverOptions,
    QueryObserverResult,
} from '@tanstack/react-query'
import { createAtom, IAtom, reaction } from 'mobx'

import { queryClient } from './queryClient'

/**
 * MobX wrapper for TanStack Query QueryObserver.
 * Enables reactive queries that integrate seamlessly with MobX stores.
 * 
 * @template TQueryFnData - Type of data returned by query function
 * @template TError - Type of error that can be thrown
 * @template TData - Type of data after select transformation
 * @template TQueryData - Type of data in cache
 * @template TQueryKey - Type of query key
 * 
 * @example
 * ```typescript
 * class UsersEntity {
 *     \@observable getAllUsersQuery: MobxQuery<UserDto[]>
 * 
 *     constructor() {
 *         this.getAllUsersQuery = new MobxQuery(() => ({
 *             queryKey: ['users'],
 *             queryFn: this.getAllUsersFn,
 *         }))
 *     }
 * 
 *     private getAllUsersFn = async (): Promise<UserDto[]> => {
 *         // ... fetch logic
 *     }
 * }
 * ```
 */
export class MobxQuery<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
> {
    private atom: IAtom
    private observer: QueryObserver<
        TQueryFnData,
        TError,
        TData,
        TQueryData,
        TQueryKey
    >
    private unsubscribe = () => {}

    constructor(
        private getOptions: () => QueryObserverOptions<
            TQueryFnData,
            TError,
            TData,
            TQueryData,
            TQueryKey
        >
    ) {
        this.atom = createAtom(
            'MobxQuery',
            () => this.startTracking(),
            () => this.stopTracking()
        )

        this.observer = new QueryObserver(queryClient, this.options)
    }

    private get options() {
        return queryClient.defaultQueryOptions(this.getOptions())
    }

    private startTracking() {
        // React to changes in query options
        const unsubscribeReaction = reaction(
            () => this.options,
            (options) => {
                this.observer.setOptions(options)
            }
        )

        // Subscribe to query observer updates
        const unsubscribeObserver = this.observer.subscribe(() => {
            this.atom.reportChanged()
        })

        this.unsubscribe = () => {
            unsubscribeReaction()
            unsubscribeObserver()
        }
    }

    private stopTracking() {
        this.unsubscribe()
    }

    /**
     * Gets the current query result.
     * Automatically tracks changes for MobX reactivity.
     */
    get result(): QueryObserverResult<TData, TError> {
        this.atom.reportObserved()
        this.observer.setOptions(this.options)
        return this.observer.getOptimisticResult(this.options)
    }

    /**
     * Gets the query data.
     * Throws promise for React Suspense if data is not available yet.
     */
    get data(): TData | undefined {
        const result = this.result
        
        if (result.isLoading && !result.data) {
            throw this.observer.fetchOptimistic(this.options)
        }
        
        return result.data
    }

    /**
     * Checks if query is loading.
     */
    get isLoading(): boolean {
        return this.result.isLoading
    }

    /**
     * Checks if query is fetching.
     */
    get isFetching(): boolean {
        return this.result.isFetching
    }

    /**
     * Checks if query has error.
     */
    get isError(): boolean {
        return this.result.isError
    }

    /**
     * Gets the query error.
     */
    get error(): TError | null {
        return this.result.error
    }

    /**
     * Checks if query is successful.
     */
    get isSuccess(): boolean {
        return this.result.isSuccess
    }

    /**
     * Manually refetch the query.
     */
    refetch() {
        return this.observer.refetch()
    }
}
