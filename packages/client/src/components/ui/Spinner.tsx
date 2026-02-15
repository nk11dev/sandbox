import './Spinner.css'

/**
 * Loading spinner component.
 */
export const Spinner = observer(function Spinner() {
    return (
        <div className="spinner">
            <div className="spinner__circle" />
        </div>
    )
})
