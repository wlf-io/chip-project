import { ChipTypeData as BaseChipTypeData } from "../../common/interfaces/source.interfaces";
import { vec2 } from "../../common/Transform";
import ChipContent from "./ChipContent";
import standardChips from "../../common/StandardChips.json";

window.addEventListener("beforeunload", () => { ChipType.Save(); });

export default class ChipType {
    private static types: { [k: string]: ChipTypeData } = {};
    private static _standard: { [k: string]: ChipTypeData } = {};
    private static init: boolean = false;

    private static _BaseChip = "base";

    private static _ChipScaleFactor: number = 4;

    public static get ChipScaleFactor(): number { return ChipType._ChipScaleFactor; }

    public static get SaveString(): string { return "CHIP_DESIGNER_TPYES"; }

    public static get BaseChip(): string { return ChipType._BaseChip; }
    public static set BaseChip(name: string) { ChipType._BaseChip = name.toLowerCase(); }

    public static get maxSize(): vec2 {
        const size = { ...ChipType.GetData(ChipType.BaseChip).size };
        size.x -= 1;
        size.y -= 1;
        return size;
    }

    private static SetType(type: string, data: ChipTypeData, save: boolean = true) {
        type = type.toLowerCase();
        data = ChipType.Sanitize(data, type);
        ChipType.types[type] = data;
        if (save) ChipType.Save();
        return data;
    }

    public static toJSON(): { [k: string]: BaseChipTypeData } {
        const types: { [k: string]: BaseChipTypeData } = {};
        for (const [name, data] of Object.entries(ChipType.types)) {
            const { content, ...rest } = data;
            types[name] = {
                ...rest,
                content: content.toJSON(),
            };
        }
        return types;
    }

    private static Standard() {
        if (!ChipType.init) ChipType.LoadStandard();
        return ChipType._standard;
    }

    public static TypeList(): string[] {
        return [...ChipType.StandardTypeList(), ...ChipType.CustomTypeList()];
    }

    public static StandardTypeList(): string[] {
        return Object.keys(ChipType.Standard());
    }

    public static CustomTypeList(): string[] {
        return Object.keys(ChipType.types).filter(type => type != ChipType.BaseChip);
    }

    public static New(type: string): string | null {
        type = type.toLowerCase();
        if (ChipType.IsStandard(type)) return null;
        ChipType.SetType(type, ChipType.GetData(type));
        return type;
    }

    private static LoadStandard() {
        Object.entries(standardChips).forEach(([name, raw]) => {
            name = name.toLowerCase();
            const data: ChipTypeData = {
                size: { ...raw.size },
                inputs: [...(raw.inputs ?? [])],
                outputs: [...(raw.outputs ?? [])],
                type: raw.type + "",
                constants: [],
                content: new ChipContent({ ...raw.size }),
                description: raw.description ?? "",
                code: null,
            };
            if (raw.hasOwnProperty("code")) data.code = raw.code;
            //@ts-ignore
            if (raw.hasOwnProperty("constants")) data.constants = [...raw.constants];
            ChipType._standard[name] = ChipType.Sanitize(data, name);
        });
        ChipType.init = true;
    }

    private static LoadChip(name: string, chipData: { [k: string]: any }) {
        name = name.toLowerCase();
        const def = ChipType.Default();
        const size = { ...(chipData.size ?? def.size) };
        const data: ChipTypeData = {
            size: size,
            inputs: [...(chipData.inputs ?? def.inputs)],
            outputs: [...(chipData.outputs ?? def.outputs)],
            type: chipData.type ?? def.type,
            constants: [...(chipData.constants ?? def.constants)],
            content: ChipContent.Factory({ ...size }).fromJSON(chipData.content ?? {}),
            description: chipData.description ?? def.description,
            code: null,
        };
        ChipType.SetType(name, data);
    }

    public static GetData(type: string): ChipTypeData {
        type = type.toLowerCase();
        let result: ChipTypeData;
        //@ts-ignore
        if (ChipType.Standard().hasOwnProperty(type)) result = ChipType.Standard()[type];
        else result = ChipType.types[type] ?? ChipType.Default();
        if (result != null) result = { ...result };
        return result;
    }

    public static IsStandard(type: string) {
        return ChipType.Standard().hasOwnProperty(type.toLowerCase());
    }

    public static Default(): ChipTypeData {
        return {
            size: { x: 1, y: 1 },
            inputs: ["A", "B"],
            outputs: ["R", ""],
            type: "custom",
            constants: [],
            content: new ChipContent({ x: 1, y: 1 }),
            description: "",
            code: null,
        }
    }

    public static AddConst(type: string, constant: string) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        data.constants.push(constant);
        ChipType.SetType(type, data);
    }

    public static RemoveConst(type: string, constant: string) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        constant = constant.toUpperCase();
        const data = ChipType.GetData(type);
        data.constants = data.constants.filter(c => c != constant);
        ChipType.SetType(type, data);
    }

    public static SetSize(type: string, size: vec2) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        data.size.x = Math.min(Math.max(size.x, 1), type != ChipType.BaseChip ? ChipType.maxSize.x : 9);
        data.size.y = Math.min(Math.max(size.y, 1), type != ChipType.BaseChip ? ChipType.maxSize.y : 5);
        ChipType.SetType(type, data)
            .content.setSize({ ...data.size });
    }

    public static SetInput(type: string, index: number, name: string) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        name = name.toUpperCase();
        if (index >= 0 && index < data.inputs.length && (data.inputs.indexOf(name) < 0 || name.length < 1)) {
            data.inputs[index] = name;
        }
        ChipType.SetType(type, data);
    }

    public static SetOutput(type: string, index: number, name: string) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        name = name.toUpperCase();
        if (index >= 0 && index < data.outputs.length && (data.outputs.indexOf(name) < 0 || name.length < 1)) {
            data.outputs[index] = name;
        }
        ChipType.SetType(type, data);
    }

    public static Save() {
        window.localStorage.setItem(ChipType.SaveString, JSON.stringify(ChipType));
    }

    public static Load() {
        const json = window.localStorage.getItem(ChipType.SaveString);
        if (json) {
            const data: { [k: string]: any } = JSON.parse(json);
            Object.entries(data).forEach((entry: [string, { [k: string]: any }]) => {
                this.LoadChip(entry[0], entry[1]);
            });
            const loaded = JSON.stringify(ChipType);
            console.assert(loaded === json, "LOAD FAILED", { stored: JSON.parse(json), loaded: JSON.parse(loaded) });
        }
    }

    public static Sanitize(data: ChipTypeData, type: string): ChipTypeData {
        data = { ...data };
        type = type.toLowerCase();
        data.inputs.length = data.size.x + 1;
        data.outputs.length = data.size.x + 1;
        for (let i = 0; i < data.inputs.length; i++) {
            data.inputs[i] = (data.inputs[i] || "").toUpperCase();
        }
        for (let i = 0; i < data.outputs.length; i++) {
            data.outputs[i] = (data.outputs[i] || "").toUpperCase();
        }
        data.constants = [...(new Set([...data.constants]))].map(c => c.toUpperCase()).filter(c => c.length);

        return data;
    }

}


export interface ChipTypeData {
    size: vec2;
    inputs: string[];
    outputs: string[];
    constants: string[];
    code: string | null;
    type: string;
    content: ChipContent;
    description: string;
}