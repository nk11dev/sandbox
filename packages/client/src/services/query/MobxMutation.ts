import {
    DefaultError,
    MutationObserver,
    MutationObserverOptions,
    MutationObserverResult,
} from '@tanstack/react-query'
import { createAtom, IAtom, reaction } from 'mobx'

import { queryClient } from './queryClient'

/**
 * MobX wrapper for TanStack Query MutationObserver.
 * Enables reactive mutations that integrate seamlessly with MobX stores.
 * 
 * @template TData - Type of data returned by mutation
 * @template TError - Type of error that can be thrown
 * @template TVariables - Type of variables passed to mutation
 * @template TContext - Type of context for optimistic updates
 * 
 * @example
 * ```typescript
 * class UsersEntity {
 *     \@observable createUserMutation: MobxMutation<UserDto, Error, CreateUserDto>
 * 
 *     constructor() {
 *         this.createUserMutation = new MobxMutation(() => ({
 *             mutationFn: this.createUserFn,
 *             onSuccess: () => {
 *                 queryClient.invalidateQueries(['users'])
 *             },
 *         }))
 *     }
 * 
 *     private createUserFn = async (data: CreateUserDto): Promise<UserDto> => {
 *         // ... mutation logic
 *     }
 * }
 * ```
 */
export class MobxMutation<
    TData = unknown,
    TError = DefaultError,
    TVariables = void,
    TContext = unknown
> {
    private atom: IAtom
    private observer: MutationObserver<TData, TError, TVariables, TContext>
    private unsubscribe = () => {}

    constructor(
        private getOptions: () => MutationObserverOptions<
            TData,
            TError,
            TVariables,
            TContext
        >
    ) {
        this.atom = createAtom(
            'MobxMutation',
            () => this.startTracking(),
            () => this.stopTracking()
        )

        this.observer = new MutationObserver(queryClient, this.options)
    }

    private get options() {
        return this.getOptions()
    }

    private startTracking() {
        // React to changes in mutation options
        const unsubscribeReaction = reaction(
            () => this.options,
            (options) => {
                this.observer.setOptions(options)
            }
        )

        // Subscribe to mutation observer updates
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
     * Gets the current mutation result.
     * Automatically tracks changes for MobX reactivity.
     */
    get result(): MutationObserverResult<TData, TError, TVariables, TContext> {
        this.atom.reportObserved()
        return this.observer.getCurrentResult()
    }

    /**
     * Gets the mutation data.
     */
    get data(): TData | undefined {
        return this.result.data
    }

    /**
     * Checks if mutation is pending.
     */
    get isPending(): boolean {
        return this.result.isPending
    }

    /**
     * Checks if mutation has error.
     */
    get isError(): boolean {
        return this.result.isError
    }

    /**
     * Gets the mutation error.
     */
    get error(): TError | null {
        return this.result.error
    }

    /**
     * Checks if mutation is successful.
     */
    get isSuccess(): boolean {
        return this.result.isSuccess
    }

    /**
     * Executes the mutation with provided variables.
     * 
     * @param variables - Variables to pass to mutation function
     * @returns Promise with mutation result
     */
    async mutate(variables: TVariables): Promise<TData> {
        return this.observer.mutate(variables)
    }

    /**
     * Resets the mutation state.
     */
    reset() {
        this.observer.reset()
    }
}
