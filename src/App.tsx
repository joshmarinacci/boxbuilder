import { useMemo } from 'react'
import { forceDownloadBlob } from './util'
import { AutoForm } from './autoform'
import { useHistoryDoc } from './schema'
import { BoxSchema, DEFAULT_BOX, boxToSolids, solidsToStlBlob } from './box'
import type { Box } from './box'
import { JscadViewer } from './viewer/JscadViewer'
import { useThemeColors } from './viewer/useThemeColors'
import './App.css'

function App() {
    const [box, setBox] = useHistoryDoc<Box>(BoxSchema, DEFAULT_BOX)
    // CSG is expensive; only rebuild when the box changes, not on unrelated re-renders.
    const solids = useMemo(() => boxToSolids(box), [box])
    const colors = useThemeColors()
    const download = () => forceDownloadBlob('box.stl', solidsToStlBlob(solids))

    return (
        <>
            <header>
                <h1>BoxBuilder</h1>
                <small>STL boxes with lids for 3D printing</small>
                <a href="https://github.com/joshmarinacci/boxbuilder">GitHub source</a>
            </header>
            <main>
                <JscadViewer solids={solids} colors={colors} label="Box and lid preview" />
            </main>
            <aside>
                <details open>
                    <summary>
                        Box <small>mm</small>
                    </summary>
                    <AutoForm schema={BoxSchema} value={box} onChange={setBox} />
                </details>
                <fieldset>
                    <legend>Export</legend>
                    <button type="submit" onClick={download}>
                        Download STL
                    </button>
                </fieldset>
            </aside>
            <footer>
                <span>
                    Box{' '}
                    <output>
                        {box.width} × {box.depth} × {box.height} mm
                    </output>
                </span>
                <span>Drag: rotate · Shift-drag: pan · Scroll: zoom</span>
            </footer>
        </>
    )
}

export default App
