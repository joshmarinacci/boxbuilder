import { useEffect, useState } from 'react'
import { DEFAULT_COLORS } from './viewerEngine'
import type { RGBA, ViewerColors } from './viewerEngine'

// WebGL needs RGBA numbers, but tooltheme's tokens are CSS colors (oklch, color-mix…). Let the
// browser resolve each token, then paint it into a 1×1 canvas to read back plain sRGB bytes.

function cssColorToRGBA(css: string, ctx: CanvasRenderingContext2D): RGBA {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    return [r / 255, g / 255, b / 255, a / 255]
}

export function readThemeColors(): ViewerColors {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    if (!ctx) return DEFAULT_COLORS
    const probe = document.createElement('span')
    probe.style.display = 'none'
    document.body.append(probe)
    const token = (name: string) => {
        probe.style.color = `var(${name})`
        return cssColorToRGBA(getComputedStyle(probe).color, ctx)
    }
    try {
        const subGrid = token('--border')
        return {
            background: token('--surface-0'),
            mesh: token('--accent-ui'),
            grid: token('--border-strong'),
            subGrid: [subGrid[0], subGrid[1], subGrid[2], 0.25],
        }
    } finally {
        probe.remove()
    }
}

/** Viewer colors from the current tooltheme tokens, kept in sync with light/dark changes. */
export function useThemeColors(): ViewerColors {
    const [colors, setColors] = useState(readThemeColors)
    useEffect(() => {
        const update = () => setColors(readThemeColors())
        const media = window.matchMedia?.('(prefers-color-scheme: dark)')
        media?.addEventListener('change', update)
        // tooltheme's applyTheme() and data-theme both live on <html>.
        const observer = new MutationObserver(update)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] })
        return () => {
            media?.removeEventListener('change', update)
            observer.disconnect()
        }
    }, [])
    return colors
}
