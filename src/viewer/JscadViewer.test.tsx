import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cuboid } from '@jscad/modeling/src/primitives'
import { JscadViewer } from './JscadViewer'
import { createView } from './orbitView'
import type { OrbitView } from './orbitView'
import type { ViewerEngine } from './viewerEngine'

// jsdom has no WebGL, so swap the engine for a recorder and check what the component asks for.
const engine = {
    setScene: vi.fn(),
    update: vi.fn<(fn: (v: OrbitView) => OrbitView) => void>(),
    destroy: vi.fn(),
} satisfies ViewerEngine

vi.mock('./viewerEngine', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./viewerEngine')>()),
    createViewerEngine: () => engine,
}))

const solids = [cuboid({ size: [1, 1, 1] })]

/** Run the camera transitions the component requested against a real starting view. */
const appliedTransitions = () => engine.update.mock.calls.map(([fn]) => fn(createView(800, 400)))

describe('JscadViewer', () => {
    beforeEach(() => vi.clearAllMocks())

    it('is a focusable, labelled viewer', () => {
        render(<JscadViewer solids={solids} label="Box preview" />)
        const viewer = screen.getByRole('application', { name: /box preview/i })
        expect(viewer).toHaveAttribute('tabindex', '0')
    })

    it('sends the solids to the engine, and again when they change', () => {
        const { rerender } = render(<JscadViewer solids={solids} />)
        expect(engine.setScene).toHaveBeenCalledTimes(1)
        expect(engine.setScene.mock.calls[0][0]).toBe(solids)
        const next = [cuboid({ size: [2, 2, 2] })]
        rerender(<JscadViewer solids={next} />)
        expect(engine.setScene).toHaveBeenLastCalledWith(next, expect.anything())
    })

    it('rotates, pans and zooms from the keyboard', async () => {
        const user = userEvent.setup()
        render(<JscadViewer solids={solids} />)
        await user.click(screen.getByRole('application'))
        await user.keyboard('{ArrowLeft}{Shift>}{ArrowUp}{/Shift}+-')
        const [rotated, panned, zoomedIn, zoomedOut] = appliedTransitions()
        const start = createView(800, 400)
        expect(rotated.controls.thetaDelta).toBeLessThan(0)
        expect(panned.camera.target).not.toEqual(start.camera.target)
        expect(zoomedIn.controls.scale).toBeLessThan(1)
        expect(zoomedOut.controls.scale).toBeGreaterThan(1)
    })

    it('ignores unrelated keys', async () => {
        const user = userEvent.setup()
        render(<JscadViewer solids={solids} />)
        await user.click(screen.getByRole('application'))
        await user.keyboard('a')
        expect(engine.update).not.toHaveBeenCalled()
    })

    it('zooms on wheel without scrolling the page', () => {
        render(<JscadViewer solids={solids} />)
        const wheel = new WheelEvent('wheel', { deltaY: -100, cancelable: true })
        screen.getByRole('application').dispatchEvent(wheel)
        expect(wheel.defaultPrevented).toBe(true)
        expect(appliedTransitions()[0].controls.scale).toBeLessThan(1)
    })

    it('releases the engine on unmount', () => {
        const { unmount } = render(<JscadViewer solids={solids} />)
        unmount()
        expect(engine.destroy).toHaveBeenCalledTimes(1)
    })
})
