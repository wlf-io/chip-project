export interface ChipSource {
    chip: ChipData,
    chipData: ChipTypeDataSet,
}

export const IsChipSource = (data: any): data is ChipSource => {
    if (!IsObj(data)) return false;
    console.log("SOURCE", "IS OBJ");
    if (!HasPropThatPasses(data, "chip", IsChip)) return false;
    console.log("SOURCE", "HAS CHIP");
    if (!HasPropThatPasses(data, "chipData", IsObj)) return false;
    console.log("SOURCE", "HAS CHIPDATA");
    for (const [name, cd] of Object.entries(data["chipData"])) {
        console.groupCollapsed("CHIPDATA: " + name);
        if (!IsChipData(cd)) {
            console.groupEnd();
            return false;
        }
        console.groupEnd();
    }
    return true;
}

export type ChipTypeDataSet = { [k: string]: ChipTypeData };

export interface ChipTypeData {
    //size: vec2;
    inputs: string[];
    outputs: string[];
    constants: string[];
    //code: string | null;
    //type: string;
    content: ChipContentData;
    code: string | null;
    //description: string;
}

export const IsChipData = (data: any): data is ChipTypeData => {
    if (!IsObj(data)) return false;
    console.log("CHIP DATA", "IS OBJ", data);
    if (!HasArrayProps(data, ["inputs", "outputs", "constants"])) return false;
    console.log("CHIP DATA", "HAS INPUTS OUTPUTS CONSTANTS");
    if (!ArrayOfType(data["inputs"], "string")) return false;
    console.log("CHIP DATA", "INPUTS IS STRING[]");
    if (!ArrayOfType(data["outputs"], "string")) return false;
    console.log("CHIP DATA", "OUTPUTS IS STRING[]");
    if (!ArrayOfType(data["constants"], "string")) return false;
    console.log("CHIP DATA", "CONSTANTS IS STRING[]");
    if (!HasPropThatPasses(data, "content", IsChipContent)) return false;
    console.log("CHIP DATA", "HAS CHIPCONTENT");
    return true;
}

export interface ChipContentData {
    chips: ChipData[];
    connections: ConnectionData[];
}

export const IsChipContent = (data: any): data is ChipContentData => {
    if (!IsObj(data)) return false;
    console.log("CHIP CONTENT", "IS OBJ")
    if (!HasArrayProps(data, ["chips", "connections"])) return false;
    console.log("CHIP CONTENT", "HAS CHIPS CONNECTIONS");
    if (!ArrayContentPasses(data["chips"], IsChip)) return false;
    console.log("CHIPCONTENT", "CHIPS IS CHIP[]");
    if (!ArrayContentPasses(data["connections"], IsConnection)) return false;
    console.log("CHIPCONTENT", "CONNECTIONS IS CONNECTION[]");
    return true;
}

export interface ChipData {
    id: string;
    name: string;
    type: string;
    constants: { [k: string]: number | string | number[] | string[] };
}

export const IsChip = (data: any): data is ChipData => {
    if (!IsObj(data)) return false;
    if (!HasPropOfType(data, "id", "string")) return false;
    if (!HasPropOfType(data, "name", "string")) return false;
    if (!HasPropOfType(data, "type", "string")) return false;
    if (!HasPropThatPasses(data, "constants", IsObj)) return false;
    return true;
}

export interface ConnectionData {
    source: PinData;
    target: PinData;
}

export const IsConnection = (data: any): data is ConnectionData => {
    if (!IsObj(data)) return false;
    if (!HasPropThatPasses(data, "source", IsPin)) return false;
    if (!HasPropThatPasses(data, "target", IsPin)) return false;
    return true;
}

export interface PinData {
    chip: string;
    name: string;
    output: boolean;
}

export const IsPin = (data: any): data is PinData => {
    if (!IsObj(data)) return false;
    if (!HasPropOfType(data, "chip", "string")) return false;
    if (!HasPropOfType(data, "name", "string")) return false;
    if (!HasPropOfType(data, "output", "boolean")) return false;
    return true;
}

type typeofT = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";

const HasArrayProps = (obj: Object, props: string[]): boolean => {
    for (const prop of props) {
        if (!HasArrayProp(obj, prop)) return false;
    }
    return true;
}

const HasArrayProp = (obj: Object, prop: string): boolean => {
    return IsObj(obj) && HasProp(obj, prop) && obj[prop] instanceof Array;
}

const HasPropOfType = (obj: Object, prop: string, type: typeofT): boolean => {
    return IsObj(obj) && HasProp(obj, prop) && typeof obj[prop] == type;
};

const ArrayContentPasses = (arr: [], func: (data: any) => boolean): boolean => {
    for (const item of arr) {
        if (!func(item)) return false;
    }
    return true;
}

const ArrayOfType = (arr: [], type: typeofT): boolean => {
    for (const item of arr) {
        if (typeof item !== type) return false;
    }
    return true;
}

const HasPropThatPasses = (obj: Object, prop: string, func: (data: any) => boolean): boolean => {
    return IsObj(obj) && HasProp(obj, prop) && func(obj[prop]);
}

// const HasProps = (obj: Object, props: string[]): boolean => {
//     for (const prop of props) {
//         if (!HasProp(obj, prop)) return false;
//     }
//     return true;
// }

const HasProp = (obj: Object, prop: string): boolean => {
    return IsObj(obj) && obj.hasOwnProperty(prop);
}

const IsObj = (obj: any): obj is Obj => {
    if (obj) {
        if (typeof obj !== "object") return false;
        if (obj instanceof Array) return false;
        return true;
    }
    return false;
}

type Obj = { [k: string]: any };