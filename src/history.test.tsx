import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { SAVE_DELAY_MS, useHistoryDoc } from './schema'
import { BoxSchema, DEFAULT_BOX } from './box'
import type { Box } from './box'

// Drives real jsdom history (pushState / back / forward) to check the URL-backed document.

const box = (width: number): Box => ({ ...DEFAULT_BOX, width })

/** Wait for jsdom to finish a history traversal and fire popstate. */
async function traverse(go: () => void) {
    const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }))
    await act(async () => {
        go()
        await popped
    })
}

describe('useHistoryDoc', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
        window.history.replaceState(null, '', '/')
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    const setup = () => renderHook(() => useHistoryDoc(BoxSchema, DEFAULT_BOX))

    const edit = (result: ReturnType<typeof setup>['result'], next: Box) => {
        act(() => result.current[1](next))
        act(() => vi.advanceTimersByTime(SAVE_DELAY_MS))
    }

    it('saves edits to the URL after a pause', () => {
        const { result } = setup()
        const before = window.history.length
        edit(result, box(20))
        expect(window.history.length).toBe(before + 1)
        expect(decodeURIComponent(window.location.search)).toContain('"width":20')
    })

    // Regression: Back pushed a new entry, which broke Forward and trapped the user.
    it('steps back and forward through edits without adding entries', async () => {
        const { result } = setup()
        edit(result, box(20))
        edit(result, box(30))
        const length = window.history.length

        await traverse(() => window.history.back())
        expect(result.current[0].width).toBe(20)
        act(() => vi.advanceTimersByTime(SAVE_DELAY_MS * 2))
        expect(window.history.length).toBe(length)

        await traverse(() => window.history.forward())
        expect(result.current[0].width).toBe(30)
    })

    // Regression: the first entry had no state, so going back to it did nothing.
    it('returns to the box the page loaded with', async () => {
        const { result } = setup()
        edit(result, box(20))
        await traverse(() => window.history.back())
        expect(result.current[0]).toEqual(DEFAULT_BOX)
    })

    it('restores a box from a shared link when going back to it', async () => {
        const shared = box(55)
        window.history.replaceState(null, '', '/?data=' + encodeURIComponent(JSON.stringify(shared)))
        const { result } = setup()
        expect(result.current[0]).toEqual(shared)
        edit(result, box(60))
        await traverse(() => window.history.back())
        expect(result.current[0]).toEqual(shared)
    })

    it('drops an unsaved edit when the user goes back', async () => {
        const { result } = setup()
        edit(result, box(20))
        act(() => result.current[1](box(99))) // not saved yet
        const length = window.history.length
        await traverse(() => window.history.back())
        act(() => vi.advanceTimersByTime(SAVE_DELAY_MS * 2))
        expect(window.history.length).toBe(length)
        expect(result.current[0]).toEqual(DEFAULT_BOX)
    })
})
