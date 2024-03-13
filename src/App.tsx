import React from 'react';
import z from "zod";
// @ts-ignore
import * as serializer from "@jscad/stl-serializer"
import {Renderer} from "jscad-react";
import {forceDownloadBlob} from "./util";
import {AutoForm} from "./autoform";
import './App.css';
import {cuboid} from "@jscad/modeling/src/primitives";
import {Geometry} from "@jscad/modeling/src/geometries/types";
import {useHistoryDoc} from "./schema";
import {subtract,union} from "@jscad/modeling/src/operations/booleans";
import {transforms} from "@jscad/modeling";

export const BoxSchema = z.object({
    width:z.number().min(1).int(),
    height:z.number().min(1).int(),
    depth:z.number().min(1).int(),
    wallThickness:z.number().min(0.1).max(5),
    lidThickness: z.number().min(0.1).max(5),
    lidTolerance: z.number().min(0.0).max(5),
    cornerRadius:z.number().min(1).max(5),
})
type Box = z.infer<typeof BoxSchema>;
const default_box = {
    width:10,
    height:10,
    depth:10,
    wallThickness:2,
    lidThickness: 2,
    lidTolerance: 2,
    cornerRadius:2,
}

function min(numbers: number[]):number {
    let m = numbers[0]
    for(let v of numbers) {
        m = Math.min(m,v)
    }
    return m
}

function box_to_solids(box:Box):Geometry[] {
    // gap between the two shapes
    let gap = 3
    let lid = box.lidThickness
    // corner radius must be smaller than half the box dimensions
    let corner = min([box.width/2,box.depth/2,box.height/2,box.cornerRadius])
    //thickness must be less than box dimensions
    let thick = min([box.wallThickness, box.width-0.1])
    let lid_tol = box.lidTolerance

    try {
    return [
        // the box
        transforms.translate(
     [-box.width/2-gap,0,box.height/2],
            subtract(
                cuboid({
                    size: [ box.width, box.depth, box.height ],
                    // roundRadius: corner,
                }),
                cuboid({
                    size: [ box.width-thick, box.depth-thick, box.height ],
                    center:[0,0,thick],
                })
            )
        ),
        // the lid
        transforms.translate(
            [box.width/2+gap,0,lid/2],
            union(
                cuboid({
                    size:[box.width-thick-lid_tol, box.depth-thick-lid_tol, lid],
                }),
                cuboid({
                    size:[box.width, box.depth, lid/2],
                    center:[0,0,-lid/2/2],
                }),
            )
        ),
        ]
    } catch (e) {
        console.log(e)
        return [cuboid({size:[1,1,1]})]
    }

}
const export_stl = (solids:Geometry[]) => {
    const rawData = serializer.serialize({binary:true},solids)
    const blob = new Blob(rawData,{type:"model/stl"})
    forceDownloadBlob("box.stl",blob)
}

function App() {
    const [box, set_box] = useHistoryDoc<Box>(BoxSchema, default_box)
    const solids = box_to_solids(box)
    return <main>
        <h1>Simple STL Box Generator</h1>
        <h2>For 3D printers</h2>
        <AutoForm object={box} schema={BoxSchema} onChange={set_box}/>
        <nav>
            <button onClick={() => export_stl(solids)}>Generate STL</button>
            <a href={"https://github.com/joshmarinacci/boxbuilder"}>GitHub source</a>
        </nav>
        <Renderer solids={solids} width={800} height={450}/>
        <aside>
            <table>
                <tr>
                    <th>action</th> <th>gesture</th>
                </tr>
                <tr>
                    <td>rotate</td> <td>left mouse drag</td>
                </tr>
                <tr>
                    <td>pan</td> <td>shift left mouse drag</td>
                </tr>
                <tr>
                    <td>zoom</td> <td>scroll wheel</td>
                </tr>
            </table>
        </aside>
    </main>
}

export default App;
