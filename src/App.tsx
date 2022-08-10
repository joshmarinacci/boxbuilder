import React, {useState} from 'react';
import z from "zod";
import {cube, sphere, cuboid} from "@jscad/modeling/src/primitives";
// @ts-ignore
import * as serializer from "@jscad/stl-serializer"
import {Renderer} from "jscad-react";
import {forceDownloadBlob} from "./util";
import {AutoForm} from "./autoform";
import './App.css';

export const BoxSchema = z.object({
    width:z.number(),
    height:z.number(),
    depth:z.number()
})
type Box = z.infer<typeof BoxSchema>;


function App() {
    const [solids, set_solids] = useState<any[]>([cube({size:12, center:[0,0,6]})])
    const [box, set_box] = useState<Box>(() => {
        return BoxSchema.parse({
            width:10,
            height:5,
            depth:5,
        })
    })
    const switch_sphere = () => set_solids([sphere({radius:5, center:[0,0,6]})])
    const switch_cube = () => set_solids([cube({size: 10, center: [0, 0, 6]})])
    const export_stl = () => {
        const rawData = serializer.serialize({binary:true},solids)
        const blob = new Blob(rawData,{type:"model/stl"})
        forceDownloadBlob("sphere.stl",blob)
    }
    const update_box = (new_box:Box) => {
        set_solids([cuboid({
            size:[
                new_box.width,new_box.height,new_box.depth
            ]
        })])
        set_box(new_box)
    }
    return <div>
        <button onClick={switch_sphere}>sphere</button>
        <button onClick={switch_cube}>cube</button>
        <button onClick={export_stl}>to STL</button>
        <AutoForm
            object={box}
            schema={BoxSchema}
            onChange={update_box}/>
        <Renderer solids={solids} height={300} width={500}/>
    </div>
}

export default App;
