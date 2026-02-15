import { observer } from 'mobx-react'
import { useEffect } from 'react'

import './Modal.css'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

/**
 * Modal dialog component.
 */
export const Modal = observer(function Modal({ isOpen, onClose, title, children }: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    if (!isOpen) {
        return null
    }

    return (
        <div 
            className="modal-overlay" 
            onClick={onClose}
            onKeyDown={(e) => e.key === 'Enter' && onClose()}
            role="button"
            tabIndex={0}
        >
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div 
                className="modal" 
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="dialog"
                tabIndex={-1}
            >
                <div className="modal__header">
                    <h2 className="modal__title">{title}</h2>
                    <button
                        className="modal__close"
                        onClick={onClose}
                        type="button"
                    >
                        ×
                    </button>
                </div>
                <div className="modal__content">{children}</div>
            </div>
        </div>
    )
})
