import { createFileRoute, useParams, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import TextArea from '../components/TextArea'
import HighlightedTextArea from '../components/HightlightedTextArea'
import { parseExpiration } from '../utils/parseExpiration'
import { Paste } from '../types/Paste'

interface PasteSearch {
    token?: string
}

export const Route = createFileRoute('/paste/$id')({
    component: PasteView,
    validateSearch: (search: Record<string, unknown>): PasteSearch => {
        return {
            token: search.token as string | undefined,
        }
    },
})

const fetchPaste = async (id: string): Promise<Paste> => {
    const response = await fetch(`/api/pastes/${id}`)
    if (!response.ok) {
        throw new Error('Failed to fetch paste')
    }
    return response.json()
}

const updatePaste = async (paste: Paste): Promise<Paste> => {
    const response = await fetch(`/api/pastes/${paste.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(paste),
    })

    if (!response.ok) {
        throw new Error('Failed to update paste')
    }

    return response.json()
}

function PasteView() {
    const { id } = Route.useParams()
    const { token } = Route.useSearch()

    const [content, setContent] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [language, setLanguage] = useState('javascript')

    const queryClient = useQueryClient()

    const { data, error, isLoading } = useQuery({
        queryKey: ['paste', id],
        queryFn: () => fetchPaste(id),
    })

    const mutation = useMutation({
        mutationFn: updatePaste,
        onSuccess: () => {
            setIsEditing(false)
            queryClient.invalidateQueries({ queryKey: ['paste', id] })
        },
    })

    const localToken = typeof window !== 'undefined' ? localStorage.getItem('pasteToken') : null
    const canEdit = (token === localToken) || (data?.token === localToken && !!localToken)
    const isExpired = data?.expirationDate ? (new Date().getTime() > data.expirationDate) : false

    useEffect(() => {
        if (isEditing && data) {
            setContent(data.content)
        }
    }, [isEditing, data])

    const handleEdit = () => {
        setIsEditing(true)
    }

    const handleSave = () => {
        if (data) {
            const updatedPaste = {
                id: data.id,
                content,
                expirationDate: new Date().getTime() + parseExpiration('10m'),
                token: data.token,
            }

            mutation.mutate(updatedPaste)
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
    }

    const handleCopyLink = () => {
        const url = window.location.href.split('?')[0]
        navigator.clipboard.writeText(url)
        alert("Link copied to clipboard!")
    }

    if (isLoading) return <div className="flex justify-center mt-10">Loading...</div>
    if (error) return <div className="text-red-500 mt-10">Error loading paste: {(error as Error).message}</div>
    if (!data) return <div className="mt-10">Paste not found</div>

    if (isExpired) {
        return <div className="mt-10 text-center text-xl">This paste has expired.</div>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Paste</h1>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleCopyLink}>
                        Copy Link
                    </Button>
                    {canEdit && !isEditing && (
                        <Button onClick={handleEdit}>Edit</Button>
                    )}
                </div>
            </div>

            {isEditing ? (
                <>
                    <TextArea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        readOnly={false}
                    />
                    <div className="flex gap-2 mt-4 justify-end">
                        <Button variant="ghost" onClick={handleCancel} disabled={mutation.isPending}>Cancel</Button>
                        <Button onClick={handleSave} disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                    {mutation.isError && <div className="text-red-500 mt-2 text-right">Failed to save</div>}
                </>
            ) : (
                <HighlightedTextArea
                    value={data.content}
                    onChange={() => { }}
                    onLanguageChange={setLanguage}
                    readOnly={true}
                    language={language}
                />
            )}
        </div>
    )
}
