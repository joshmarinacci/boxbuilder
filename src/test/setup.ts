import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom doesn't implement pointer capture; give it a minimal one so pointer handlers can run.
if (!Element.prototype.setPointerCapture) {
    const captured = new WeakMap<Element, Set<number>>()
    const ids = (el: Element) => captured.get(el) ?? captured.set(el, new Set()).get(el)!
    Element.prototype.setPointerCapture = function (id: number) {
        ids(this).add(id)
    }
    Element.prototype.releasePointerCapture = function (id: number) {
        ids(this).delete(id)
    }
    Element.prototype.hasPointerCapture = function (id: number) {
        return ids(this).has(id)
    }
}

afterEach(() => {
    cleanup()
})
