import {ZodArray, ZodEffects, ZodEnum, ZodNumber, ZodObject, ZodString} from "zod";
import React, {useState, ChangeEvent} from "react";
import {HBox} from "./common";

function NumberInput<T extends ZodNumber>(props: {
    schema: T,
    value: number,
    name: string,
    onChange: (n: number) => void,
    range: boolean
}) {
    let scale = 1
    if(!props.schema.isInt) {
        scale = 10
    }
    const update = (e:ChangeEvent<HTMLInputElement>) => {
        if (props.schema.isInt) {
            let v = parseInt(e.target.value)
            props.onChange(v)
        } else {
            let v = parseFloat(e.target.value)
            props.onChange(v/scale)
        }
    }
    return <input
        // type={props.range?"range":"number"}
        type={"range"}
        value={props.value*scale}
        min={props.schema.minValue !== null ? props.schema.minValue*scale : undefined}
        max={props.schema.maxValue !== null ? props.schema.maxValue*scale : undefined}
        onChange={update}
    />
}

function StringInput<T extends ZodString>(props: {
    schema: T,
    value: string,
    name: string,
    onChange: (n: string) => void,
}) {
    return <input
        type={"text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
    />
}

function EnumInput<T extends ZodEnum<any>>(props: {
    schema: T,
    onChange: (v: any) => void,
    name: string,
    value: any
}) {
    return <div>
        <select
            value={props.value}
            onChange={(e) => {
                props.onChange(e.target.value)
            }}>
            {
                Object.entries(props.schema.enum).map(([k, v]) => {
                    return <option key={k} value={k}>{v}</option>
                })
            }
        </select>
    </div>
}

function ArrayInput<T extends ZodArray<any>>(props: {
    schema: T,
    onChange: (v: any[]) => void,
    name: string,
    value: any[]
}) {
    const [txt, set_txt] = useState("")
    const add = () => {
        let arr = [...props.value]
        arr.push(txt)
        props.onChange(arr)
        set_txt("")
    }
    const nuke = (index: number) => {
        let arr = props.value.slice()
        arr.splice(index, 1)
        props.onChange(arr)
    }
    return <ul>
        {props.value.map((v, i) => {
            return <li key={i}>{v}
                <button onClick={() => nuke(i)}>[x]</button>
            </li>
        })}
        <HBox>
            <input type={"text"} value={txt} onChange={(e) => set_txt(e.target.value)}
                   onKeyDown={e => {
                       if (e.code === 'Enter') add()
                   }
                   }
            />
            <button onClick={add}>add</button>
        </HBox>

    </ul>
}

function ObjectInput<T extends ZodObject<any>>(props: {
    schema: T,
    name: string,
    onChange: (e: any) => void,
    object: any
}) {
    const update_object_property = (k: string, v: any) => {
        // console.log("nested update",k,v)
        let new_obj = {...props.object}
        new_obj[k] = v
        props.onChange(new_obj)
    }
    return <div>
        {Object.entries(props.schema.shape).map(([k, v]) => {
            // console.log("child is",k,props.object[k],v)
            if (v instanceof ZodNumber) {
                return <HBox key={k}>
                    <label>{k}</label>
                    <NumberInput range={false}
                                 schema={v}
                                 name={k}
                                 value={props.object[k]}
                                 onChange={(v) => update_object_property(k, v)}
                    />
                    <label>{props.object[k]}</label>
                </HBox>
            }
            if (v instanceof ZodString) {
                return <HBox key={k}>
                    <label>{k}</label>
                    <StringInput
                        schema={v as ZodString}
                        name={k}
                        value={props.object[k]}
                        onChange={(v) => update_object_property(k, v)}
                    />
                </HBox>
            }
            if (v instanceof ZodEnum) {
                return <HBox key={k}>
                    <label>{k}</label>
                    <EnumInput
                        schema={v as ZodEnum<any>}
                        name={k}
                        value={props.object[k]}
                        onChange={(v) => update_object_property(k, v)}
                    />
                </HBox>
            }
            if (v instanceof ZodArray) {
                // console.log("v is array",v)
                return <HBox key={k}>
                    <label>{k}</label>
                    <ArrayInput
                        schema={v as ZodArray<any>}
                        name={k}
                        value={props.object[k] as any[]}
                        onChange={(v) => update_object_property(k, v)}
                    />
                </HBox>
            }
            if (v instanceof ZodObject) {
                return <HBox key={k}>
                    <label>{k}</label>
                    <ObjectInput
                        schema={v as ZodObject<any>}
                        name={k}
                        object={props.object[k]}
                        onChange={(v) => update_object_property(k, v)}
                    />
                </HBox>
            }
            if (v instanceof ZodEffects && v._def.schema instanceof ZodObject) {
                // console.log('is a wrapped object')
                return <HBox key={k}>
                    <label>{k}</label>
                    <label>effect</label>
                    <ObjectInput
                        schema={v._def.schema as ZodObject<any>}
                        name={k}
                        object={props.object[k]}
                        onChange={(v) => update_object_property(k, v)}
                    />
                </HBox>
            }
            return <div key={k}>child prop {k}</div>
        })}
    </div>
}

export function AutoForm<T>(props: {
    schema: any,
    object: any
    onChange: (v: T) => void
}) {
    // console.log("auto form object is",props.schema, props.object)
    return <div className="auto-form">
        <ObjectInput schema={props.schema} name={"self"} onChange={props.onChange}
                     object={props.object}/>
    </div>
}
