import React, {ReactNode} from "react";

export function HBox(props: { children: ReactNode }) {
    return <div className={"hbox"}>{props.children}</div>
}
