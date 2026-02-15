import { useEffect, useMemo } from 'react'
import { observer } from 'mobx-react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { GroupProfileState } from '@/stores'

import './GroupProfilePage.css'

/**
 * GroupProfilePage component for editing a single group.
 * 
 * **Case 1: MobX + TanStack Query + HTTP Integration**
 * **Case 5: Cache reading optimization**
 * 
 * This page demonstrates:
 * - Loading data with cache-first approach
 * - Managing form state with MobX
 * - Multiselect for roles
 * - Detecting unsaved changes
 * 
 * The group data is first attempted to be read from cache,
 * only fetching from server if not found.
 */
export const GroupProfilePage = observer(() => {
    const { id } = useParams<{ id: string }>()
    const state = useMemo(() => new GroupProfileState(), [])

    useEffect(() => {
        if (id) {
            state.loadGroup(parseInt(id, 10))
        }

        return () => {
            state.clear()
        }
    }, [id, state])

    if (!id) {
        return (
            <div className="group-profile-page">
                <div className="group-profile-page__error">Invalid group ID</div>
            </div>
        )
    }

    if (state.isLoading || state.isRolesLoading) {
        return (
            <div className="group-profile-page">
                <div className="group-profile-page__loading">
                    <Spinner />
                    <p>Loading group...</p>
                </div>
            </div>
        )
    }

    if (state.error) {
        return (
            <div className="group-profile-page">
                <div className="group-profile-page__error">
                    Error: {state.error}
                    <Link to="/groups">
                        <Button variant="secondary">Back to Groups</Button>
                    </Link>
                </div>
            </div>
        )
    }

    if (!state.group) {
        return (
            <div className="group-profile-page">
                <div className="group-profile-page__error">Group not found</div>
            </div>
        )
    }

    return (
        <div className="group-profile-page">
            <div className="group-profile-page__header">
                <Link to="/groups" className="group-profile-page__back">
                    ← Back to Groups
                </Link>
                <h1 className="group-profile-page__title">
                    Edit Group: {state.group.name}
                </h1>
            </div>

            <form
                className="group-profile-page__form"
                onSubmit={(e) => {
                    e.preventDefault()
                    state.saveChanges()
                }}
            >
                <Input
                    label="Name"
                    value={state.formData.name}
                    onChange={(value) => state.updateFormField('name', value)}
                    required
                />

                <div className="group-profile-page__field">
                    <label className="group-profile-page__label">
                        Roles *
                    </label>
                    <select
                        multiple
                        value={state.formData.roles.map(String)}
                        onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions).map(
                                (opt) => parseInt(opt.value, 10)
                            )
                            state.updateFormField('roles', selected)
                        }}
                        className="group-profile-page__multiselect"
                        size={8}
                    >
                        {state.availableRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                    <small className="group-profile-page__help">
                        Hold Ctrl/Cmd to select multiple roles
                    </small>
                </div>

                <Input
                    label="Description"
                    value={state.formData.description}
                    onChange={(value) => state.updateFormField('description', value)}
                />

                {state.hasChanges && (
                    <div className="group-profile-page__unsaved">
                        You have unsaved changes
                    </div>
                )}

                <div className="group-profile-page__actions">
                    <Button
                        variant="secondary"
                        type="button"
                        onClick={() => state.resetForm()}
                        disabled={!state.hasChanges || state.isSaving}
                    >
                        Reset
                    </Button>
                    <Button
                        type="submit"
                        disabled={!state.isFormValid || !state.hasChanges || state.isSaving}
                    >
                        {state.isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    )
})
