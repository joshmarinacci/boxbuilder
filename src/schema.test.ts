import { afterEach, describe, expect, it } from 'vitest'
import { startDoc } from './schema'
import { BoxSchema, DEFAULT_BOX } from './box'

const setSearch = (search: string) => window.history.replaceState(null, '', '/' + search)

describe('startDoc', () => {
    afterEach(() => setSearch(''))

    it('uses the default when the URL has no data', () => {
        expect(startDoc(BoxSchema, DEFAULT_BOX)).toEqual(DEFAULT_BOX)
    })

    it('restores a box saved in the URL', () => {
        const saved = { ...DEFAULT_BOX, width: 42 }
        setSearch('?data=' + encodeURIComponent(JSON.stringify(saved)))
        expect(startDoc(BoxSchema, DEFAULT_BOX)).toEqual(saved)
    })

    it('ignores invalid data in the URL', () => {
        setSearch('?data=' + encodeURIComponent(JSON.stringify({ width: 'wide' })))
        expect(startDoc(BoxSchema, DEFAULT_BOX)).toEqual(DEFAULT_BOX)
    })
})
