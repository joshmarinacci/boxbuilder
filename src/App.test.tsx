import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'

// jsdom has no WebGL; record what the app hands the viewer instead.
const viewerSolids: Geom3[][] = []
vi.mock('./viewer/JscadViewer', () => ({
    JscadViewer: ({ solids }: { solids: Geom3[] }) => {
        viewerSolids.push(solids)
        return <div role="application" aria-label="3D preview" />
    },
}))

describe('App', () => {
    beforeEach(() => {
        viewerSolids.length = 0
        window.history.replaceState(null, '', '/')
    })
    afterEach(() => vi.restoreAllMocks())

    it('lays out the tooltheme app shell', () => {
        render(<App />)
        expect(screen.getByRole('banner')).toHaveTextContent('BoxBuilder')
        expect(screen.getByRole('main')).toContainElement(screen.getByRole('application'))
        expect(screen.getByRole('complementary')).toBeInTheDocument()
        expect(screen.getByRole('contentinfo')).toHaveTextContent('10 × 10 × 10 mm')
    })

    it('shows a labelled slider and number box for every box dimension', () => {
        render(<App />)
        for (const name of ['Width', 'Height', 'Depth', 'Wall thickness', 'Lid thickness', 'Lid tolerance']) {
            expect(screen.getByRole('slider', { name })).toBeInTheDocument()
            expect(screen.getByRole('spinbutton', { name })).toBeInTheDocument()
        }
    })

    it('rebuilds the model when a dimension is typed', async () => {
        const user = userEvent.setup()
        render(<App />)
        const width = screen.getByRole('spinbutton', { name: 'Width' })
        const before = viewerSolids.at(-1)
        await user.clear(width)
        await user.type(width, '42')
        expect(width).toHaveValue(42)
        expect(screen.getByRole('slider', { name: 'Width' })).toHaveValue('42')
        expect(screen.getByRole('contentinfo')).toHaveTextContent('42 × 10 × 10 mm')
        expect(viewerSolids.at(-1)).not.toBe(before)
    })

    it('keeps the last value while the number box is empty, then restores it on blur', async () => {
        const user = userEvent.setup()
        render(<App />)
        const depth = screen.getByRole('spinbutton', { name: 'Depth' })
        await user.clear(depth)
        expect(depth).toHaveValue(null)
        expect(screen.getByRole('slider', { name: 'Depth' })).toHaveValue('10')
        await user.tab()
        expect(depth).toHaveValue(10)
    })

    it('uses schema bounds and steps for sliders', () => {
        render(<App />)
        const wall = screen.getByRole('slider', { name: 'Wall thickness' })
        expect(wall).toHaveAttribute('step', '0.1')
        expect(wall).toHaveAttribute('max', '5')
        // Regression: zod 4 reports MAX_SAFE_INTEGER as the max of an int(), which made the
        // width slider unusable. Unbounded fields should leave max to the browser default.
        const width = screen.getByRole('slider', { name: 'Width' })
        expect(width).toHaveAttribute('min', '1')
        expect(width).not.toHaveAttribute('max')
    })

    it('updates the model and number box from the slider', () => {
        render(<App />)
        // user-event can't drive native range inputs, so fire the change the browser would.
        fireEvent.change(screen.getByRole('slider', { name: 'Height' }), { target: { value: '12' } })
        expect(screen.getByRole('spinbutton', { name: 'Height' })).toHaveValue(12)
        expect(screen.getByRole('contentinfo')).toHaveTextContent('10 × 10 × 12 mm')
    })

    it('downloads an STL', async () => {
        const user = userEvent.setup()
        const createObjectURL = vi.fn(() => 'blob:box')
        Object.assign(URL, { createObjectURL })
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
        render(<App />)
        await user.click(screen.getByRole('button', { name: 'Download STL' }))
        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
        expect(click).toHaveBeenCalledTimes(1)
    })
})
