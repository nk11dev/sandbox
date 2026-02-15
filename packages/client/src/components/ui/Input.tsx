import './Input.css'

interface InputProps {
    label: string
    value: string
    onChange: (value: string) => void
    type?: string
    placeholder?: string
    required?: boolean
}

/**
 * Reusable Input component with label.
 */
export function Input({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    required = false,
}: InputProps) {
    return (
        <div className="input-group">
            <label className="input-label">
                {label}
                {required && <span className="input-required">*</span>}
            </label>
            <input
                className="input-field"
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
            />
        </div>
    )
}
