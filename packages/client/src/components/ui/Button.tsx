import classNames from 'classnames'

import './Button.css'

interface ButtonProps {
    children: React.ReactNode
    onClick?: () => void
    variant?: 'primary' | 'danger' | 'secondary'
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
}

/**
 * Reusable Button component with different variants.
 */
export const Button = observer(function Button({
    children,
    onClick,
    variant = 'primary',
    disabled = false,
    type = 'button',
}: ButtonProps) {
    return (
        <button
            className={classNames('button', `button--${variant}`)}
            onClick={onClick}
            disabled={disabled}
            type={type}
        >
            {children}
        </button>
    )
})
