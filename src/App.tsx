import React, {useState} from 'react';
import z from "zod";
import {cuboid} from "@jscad/modeling/src/primitives";
// @ts-ignore
import * as serializer from "@jscad/stl-serializer"
import {Renderer} from "jscad-react";
import {forceDownloadBlob} from "./util";
import {AutoForm} from "./autoform";
import './App.css';
import {Geom3} from "@jscad/modeling/src/geometries/types";

export const BoxSchema = z.object({
    width:z.number(),
    height:z.number(),
    depth:z.number()
})
type Box = z.infer<typeof BoxSchema>;


function box_to_solids(new_box:Box):Geom3[] {
    return [
        cuboid({size: [ new_box.width, new_box.height, new_box.depth ]})
    ]
}

const start_box:Box = BoxSchema.parse({
    width:10,
    height:5,
    depth:5,
})

function App() {
    const [box, set_box] = useState<Box>(start_box)
    const [solids, set_solids] = useState(()=>box_to_solids(box))
    const export_stl = () => {
        const rawData = serializer.serialize({binary:true},solids)
        const blob = new Blob(rawData,{type:"model/stl"})
        forceDownloadBlob("sphere.stl",blob)
    }
    const update_box = (new_box:Box) => {
        set_solids(box_to_solids(new_box))
        set_box(new_box)
    }
    return <div>
        <AutoForm object={box} schema={BoxSchema} onChange={update_box}/>
        <Renderer solids={solids}  width={800} height={450}/>
        <button onClick={export_stl}>to STL</button>
    </div>
}

export default App;
