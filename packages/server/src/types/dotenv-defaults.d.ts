declare module 'dotenv-defaults' {
    interface DotenvConfigOutput {
        parsed?: Record<string, string>
        error?: Error
    }

    interface DotenvConfigOptions {
        path?: string
        defaults?: string
        encoding?: string
    }

    function config(options?: DotenvConfigOptions): DotenvConfigOutput

    export default { config }
}
