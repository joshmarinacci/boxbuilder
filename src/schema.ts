import type { ZodType } from 'zod'
import { useEffect, useState } from 'react'

// The document lives in the URL (`?data=<json>`) and in browser history, so links restore a box
// and Back/Forward step through edits. Edits are pushed as history entries after a short pause.

export const SAVE_DELAY_MS = 1000

/** Read the starting document from `?data=<json>` in the URL, falling back to `backup`. */
export function startDoc<T>(schema: ZodType<T>, backup: T): T {
    const startBox = schema.parse(backup)
    try {
        const q = window.location.search
        if (q && q.startsWith('?data=')) {
            const json = decodeURIComponent(q.substring(6))
            return schema.parse(JSON.parse(json))
        }
    } catch (e) {
        console.log('ignoring invalid ?data= in the URL', e)
    }
    return startBox
}

const docUrl = (doc: unknown) => '?data=' + encodeURIComponent(JSON.stringify(doc))

let saveTimer: ReturnType<typeof setTimeout> | undefined

/** Push `doc` as a new history entry once edits pause, replacing any save still waiting. */
export function saveDoc<T>(doc: T) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        saveTimer = undefined
        window.history.pushState(doc, '', docUrl(doc))
    }, SAVE_DELAY_MS)
}

export function cancelPendingSave() {
    clearTimeout(saveTimer)
    saveTimer = undefined
}

export function useHistoryDoc<A>(schema: ZodType<A>, defaultDoc: A): [A, (a: A) => void] {
    const [doc, setDoc] = useState<A>(() => startDoc(schema, defaultDoc))
    const update = (next: A) => {
        setDoc(next)
        saveDoc(next)
    }
    useEffect(() => {
        // The entry the page loaded on has no state yet; give it one so Back can return to it.
        if (window.history.state === null) {
            window.history.replaceState(startDoc(schema, defaultDoc), '', window.location.href)
        }
        const historyChanged = (event: PopStateEvent) => {
            // Navigating away wins over an edit that hasn't been saved yet.
            cancelPendingSave()
            // Restore only: pushing here would add an entry and break Forward.
            const parsed = schema.safeParse(event.state)
            setDoc(parsed.success ? parsed.data : startDoc(schema, defaultDoc))
        }
        window.addEventListener('popstate', historyChanged)
        return () => {
            window.removeEventListener('popstate', historyChanged)
            cancelPendingSave()
        }
    }, [schema, defaultDoc])
    return [doc, update]
}
