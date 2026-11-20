import type { ZodType } from 'zod'
import { useEffect, useState } from 'react'

/** Read the starting document from `?data=<json>` in the URL, falling back to `backup`. */
export function startDoc<T>(schema: ZodType<T>, backup: T): T {
    const startBox = schema.parse(backup)
    try {
        const q = window.location.search
        if (q && q.startsWith('?data=')) {
            const json = decodeURIComponent(q.substring(6))
            const data = schema.parse(JSON.parse(json))
            console.log('got data from url', data)
            return data
        }
    } catch (e) {
        console.log('error happened', e)
    }
    return startBox
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
function debounce(callback: () => void, time: number) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(callback, time)
}

export function saveDoc<T>(doc: T) {
    debounce(() => {
        const str = encodeURIComponent(JSON.stringify(doc))
        window.history.pushState(doc, 'box-state', '?data=' + str)
    }, 1000)
}

export function useHistoryDoc<A>(schema: ZodType<A>, defaultDoc: A): [A, (a: A) => void] {
    const [doc, setDoc] = useState<A>(() => startDoc(schema, defaultDoc))
    const update = (next: A) => {
        setDoc(next)
        saveDoc(next)
    }
    useEffect(() => {
        const historyChanged = (event: PopStateEvent) => {
            try {
                const restored = schema.parse(event.state)
                setDoc(restored)
                saveDoc(restored)
            } catch {
                console.log('error restoring from history')
            }
        }
        window.addEventListener('popstate', historyChanged)
        return () => window.removeEventListener('popstate', historyChanged)
    }, [schema])
    return [doc, update]
}
