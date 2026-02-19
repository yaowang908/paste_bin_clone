import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { parseExpiration } from '../utils/parseExpiration'
import TextArea from '../components/TextArea'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select'
import { Paste } from '../types/Paste'

export const Route = createFileRoute('/')({
    component: Home,
})

const createPaste = async (paste: Paste) => {
    const response = await fetch('/api/pastes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(paste),
    })

    if (!response.ok) {
        throw new Error('Failed to create paste')
    }

    return response.json()
}

function Home() {
    const [content, setContent] = useState('')
    const [expiration, setExpiration] = useState('10m')
    const navigate = useNavigate()

    const mutation = useMutation({
        mutationFn: createPaste,
        onSuccess: (data) => {
            localStorage.setItem('pasteToken', data.token)
            navigate({ to: `/paste/${data.id}`, search: { token: data.token } })
        },
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content) return

        const token = uuidv4()
        const pasteId = uuidv4()
        const expirationDate = new Date().getTime() + parseExpiration(expiration)

        const paste = { id: pasteId, content, expirationDate, token }

        mutation.mutate(paste)
    }

    return (
        <div>
            <TextArea value={content} onChange={(e) => setContent(e.target.value)} readOnly={false} />
            <div className="flex items-end justify-between mt-4">
                <div className="max-w-sm">
                    <label htmlFor="expirationTime" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Select an expiration time</label>
                    <Select
                        value={expiration}
                        onValueChange={setExpiration}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Set expiration time" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10m">10 minutes</SelectItem>
                            <SelectItem value="1h">1 hour</SelectItem>
                            <SelectItem value="1d">1 day</SelectItem>
                            <SelectItem value="5d">5 days</SelectItem>
                            <SelectItem value="15d">15 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {mutation.isError && <span className="text-red-500 text-sm">Error creating paste</span>}
                    <Button
                        variant="outline"
                        onClick={handleSubmit}
                        disabled={!content || mutation.isPending}
                    >
                        {mutation.isPending ? 'Creating...' : 'Submit'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
