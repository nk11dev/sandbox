declare module 'dotenv-parse-variables' {
    function dotenvParseVariables(
        env: Record<string, string>
    ): Record<string, string | number | boolean>

    export default dotenvParseVariables
}
