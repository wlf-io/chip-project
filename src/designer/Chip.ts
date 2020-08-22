import { Rect, Vec2 } from "../common/Transform";
import standardChips from "../common/StandardChips.json";

export class ChipType {
    private static types: { [k: string]: ChipTypeData } = {};
    private static _standard: { [k: string]: ChipTypeData } = {};
    private static init: boolean = false;

    private static _BaseChip = "base";

    public static get BaseChip(): string { return ChipType._BaseChip; }
    public static set BaseChip(name: string) { ChipType._BaseChip = name.toLowerCase(); }

    public static get maxSize(): Vec2 {
        const size = { ...ChipType.GetData(ChipType.BaseChip).size };
        size.x -= 1;
        size.y -= 1;
        return size;
    }

    public static toJSON(): { [k: string]: any } {
        return { ...ChipType.types };
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

    public static New(type: string) {
        type = type.toLowerCase();
        if (ChipType.IsStandard(type)) return;
        ChipType.types[type] = ChipType.GetData(type);
    }

    private static LoadStandard() {
        Object.entries(standardChips).forEach(([name, raw]) => {
            name = name.toLowerCase();
            const data: ChipTypeData = {
                size: { ...raw.size },
                inputs: [...raw.inputs].map(val => (val ?? "").toUpperCase()),
                outputs: [...raw.outputs].map(val => (val ?? "").toUpperCase()),
                type: raw.type + "",
                constants: [],
                content: new ChipContent(),
                description: raw.description ?? "",
            };
            if (raw.hasOwnProperty("code")) data.code = raw.code;
            //@ts-ignore
            if (raw.hasOwnProperty("constants")) data.constants = [...raw.constants];
            data.constants.map(val => (val ?? "").toUpperCase());
            data.inputs.length = data.size.x + 1;
            data.outputs.length = data.size.x + 1;
            ChipType._standard[name] = data;
        });
        ChipType.init = true;
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
            outputs: ["R"],
            type: "custom",
            constants: [],
            content: new ChipContent(),
            description: "",
        }
    }

    public static SetSize(type: string, size: Vec2) {
        if (ChipType.IsStandard(type)) return;
        console.log("Set Size", type, size);
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        data.size = { ...size };
        data.size.x = Math.min(Math.max(data.size.x, 1), type != ChipType.BaseChip ? ChipType.maxSize.x : 9);
        data.size.y = Math.min(Math.max(data.size.y, 1), type != ChipType.BaseChip ? ChipType.maxSize.y : 5);
        data.inputs.length = data.size.x + 1;
        data.outputs.length = data.size.x + 1;
        ChipType.types[type] = data;
    }

    public static SetInput(type: string, index: number, name: string) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        name = name.toUpperCase();
        if (index >= 0 && index < data.inputs.length && data.inputs.indexOf(name) < 0) {
            data.inputs[index] = name;
        }
        ChipType.types[type] = data;
    }

    public static SetOutput(type: string, index: number, name: string) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        name = name.toUpperCase();
        if (index >= 0 && index < data.outputs.length && data.outputs.indexOf(name) < 0) {
            data.outputs[index] = name;
        }
        ChipType.types[type] = data;
    }

}

interface ChipTypeData {
    size: Vec2;
    inputs: string[];
    outputs: string[];
    constants: string[];
    code?: string;
    type: string;
    content: ChipContent;
    description: string;
}

export class Chip {
    private _id: string;
    private _pos: Vec2 = { x: 0, y: 0 };
    private _type: string = "AND";
    private _name: string = "";

    private _constants: { [k: string]: number | string } = {};


    constructor(id: string, type: string, pos: Vec2 = { x: 1, y: 1 }) {
        this._type = type.toLowerCase();
        ChipType.New(type);
        this._id = id;
        this._pos = { ...pos };
    }

    public get id(): string { return this._id; }
    public get name(): string { return this._name.length < 1 ? (this.isStandard ? this.type.toUpperCase() : this.type) : this._name; }
    public set name(name: string) { this._name = name; }
    public get type(): string { return this._type; }
    public set type(type: string) { this._type = type; }
    public get isStandard(): boolean { return ChipType.IsStandard(this.type); }
    public get inputs(): string[] { return [...this.getData().inputs]; }
    public get outputs(): string[] { return [...this.getData().outputs]; }
    public get size(): Vec2 { return { ...this.getData().size }; }
    public get pos(): Vec2 { return { ...this._pos }; }
    public get description(): string { return this.getData().description; }
    public get constants(): { [k: string]: number | string } {
        const consts: { [k: string]: number | string } = {};
        this.getData().constants.forEach(key => consts[key] = this._constants[key] ?? "");
        return consts;
    };

    public get rect(): Rect {
        const size = this.size;
        return {
            left: this.pos.x,
            right: this.pos.x + size.x,
            top: this.pos.y,
            bottom: this.pos.y + size.y,
        };
    }


    public toJSON(): { [k: string]: any } {
        return {
            name: this.name,
            type: this.type,
            pos: this.pos,
            constants: this.constants,
        };
    }

    intersects(chip: Chip, pad: number = 0.5) {
        const self: Rect = this.rect;
        const other: Rect = chip.rect;
        const x_overlap = Math.max(0, Math.min(self.right + pad, other.right + pad) - Math.max(self.left - pad, other.left - pad));
        const y_overlap = Math.max(0, Math.min(self.bottom + pad, other.bottom + pad) - Math.max(self.top - pad, other.top - pad));
        return x_overlap * y_overlap;
    }

    getData(): ChipTypeData {
        return ChipType.GetData(this.type);
    }

    public setPos(pos: Vec2, gridSize: Vec2): Chip {
        this._pos = { ...pos };
        this.clamp2Grid(gridSize);
        return this;
    }

    setInput(index: number, name: string): Chip {
        ChipType.SetInput(this.type, index, name);
        return this;
    }

    setOutput(index: number, name: string): Chip {
        ChipType.SetOutput(this.type, index, name);
        return this;
    }

    setSize(size: Vec2): Chip {
        ChipType.SetSize(this.type, size);
        return this;
    }

    setConstant(key: string, value: string | number) {
        if (this.getData().constants.indexOf(key) >= 0) {
            console.log("SET CONSTANT", this.id, this.getData().constants.indexOf(key), key, value);
            this._constants[key] = value;
        }
    }


    public gridPos(gridScale: number): Vec2 {
        return { x: this._pos.x * gridScale, y: this._pos.y * gridScale };
    }

    public gridSize(gridScale: number): Vec2 {
        return { x: this.size.x * gridScale, y: this.size.y * gridScale };
    }

    public chipBounds(gridScale: number, edge: number = 0): [Vec2, Vec2] {
        const pos = this.gridPos(gridScale);
        const size = this.gridSize(gridScale);
        edge = Math.floor(gridScale * edge);
        size.x += pos.x + edge;
        size.y += pos.y + edge
        pos.x -= edge;
        pos.y -= edge;
        return [pos, size];
    }

    public clamp2Grid(gridSize: Vec2) {
        if (this._pos.x < 1) this._pos.x = 1;
        if (this._pos.y < 1) this._pos.y = 1;
        if ((this._pos.x + this.size.x) >= gridSize.x) this._pos.x = gridSize.x - this.size.x - 1;
        if ((this._pos.y + this.size.y) >= gridSize.y) this._pos.y = gridSize.y - this.size.y - 1;
    }

}

export class ChipContent {
    private _chips: { [k: string]: Chip } = {};
    private _connections: Connection[] = [];

    public get connections(): Connection[] { return [...this._connections]; }
    public get chips(): Chip[] { return Object.values(this._chips); }

    public toJSON(): { [k: string]: any } {
        return {
            chips: this.chips,
            connections: this.connections,
        };
    }

    public getChip(id: string): Chip | null {
        return this._chips[id] ?? null;
    }

    public addChip(chip: Chip) {
        if (chip.size.x > ChipType.maxSize.x || chip.size.y > ChipType.maxSize.y) return false;
        if (this._chips.hasOwnProperty(chip.id)) return false;
        this._chips[chip.id] = chip;
        return true;
    }

    public removeChip(id: string) {
        if (this._chips.hasOwnProperty(id)) {
            delete this._chips[id];
            this._connections = this._connections.filter(connection => connection.source.chip != id && connection.target.chip != id);
        }
    }
}

export class Connection {
    public level: number = 0;
    public _path: Vec2[] = [];
    private _source: ChipConnector = new ChipConnector();
    private _target: ChipConnector = new ChipConnector();

    public setSource(chip: Chip, name: string) {
        this._source = new ChipConnector(chip.id, false, name);
    }
    public setTarget(chip: Chip, name: string) {
        this._target = new ChipConnector(chip.id, true, name);
    }

    public toJSON(): { [k: string]: any } {
        return {
            level: this.level,
            path: this.path,
            source: this.source,
            target: this.target,
        };
    }

    public get source(): ChipConnector { return this._source; }
    public get target(): ChipConnector { return this._target; }
    public get path(): Vec2[] { return [...this._path]; }
}

export class ChipConnector {
    private _chip: string;
    private _output: boolean;
    private _name: string;
    constructor(chip: string = "", output: boolean = false, name: string = "") {
        this._chip = chip;
        this._output = output;
        this._name = name;
    }

    public toJSON(): { [k: string]: any } {
        return {
            chip: this.chip,
            output: this.output,
            name: this.name,
        };
    }

    public get chip(): string { return this._chip; }
    public get output(): boolean { return this._output; }
    public get name(): string { return this._name; }
}