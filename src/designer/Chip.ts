import { Rect, Rectangle, Vec2, Vector2 } from "../common/Transform";
import standardChips from "../common/StandardChips.json";
import { AStarFinder } from "astar-typescript";


window.addEventListener("beforeunload", () => { ChipType.Save(); });

export class ChipType {
    private static types: { [k: string]: ChipTypeData } = {};
    private static _standard: { [k: string]: ChipTypeData } = {};
    private static init: boolean = false;

    private static _BaseChip = "base";

    private static _ChipScaleFactor: number = 3;

    public static get ChipScaleFactor(): number { return ChipType._ChipScaleFactor; }

    public static get SaveString(): string { return "CHIP_DESIGNER_TPYES"; }

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

    public static New(type: string): string | null {
        type = type.toLowerCase();
        if (ChipType.IsStandard(type)) return null;
        ChipType.types[type] = ChipType.GetData(type);
        ChipType.Save();
        return type;
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
                content: new ChipContent({ x: raw.size.x * ChipType.ChipScaleFactor, y: raw.size.y * ChipType.ChipScaleFactor }),
                description: raw.description ?? "",
                code: null,
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

    private static LoadChip(name: string, chipData: { [k: string]: any }) {

        const def = ChipType.Default();
        const size = { ...(chipData.size ?? def.size) };
        const chipType: ChipTypeData = {
            size: size,
            inputs: [...(chipData.inputs ?? def.inputs)].map(n => (n ?? "").toUpperCase()),
            outputs: [...(chipData.outPuts ?? def.outputs)].map(n => (n ?? "").toUpperCase()),
            type: chipData.type ?? def.type,
            constants: [...(chipData.constants ?? def.constants)],
            content: ChipContent.Factory({ x: size.x * ChipType.ChipScaleFactor, y: size.y * ChipType.ChipScaleFactor }).fromJSON(chipData.content ?? {}),
            description: chipData.description ?? def.description,
            code: null,
        };

        ChipType.types[name] = chipType;
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
            content: new ChipContent({ x: 1, y: 1 }),
            description: "",
            code: null,
        }
    }

    public static SetSize(type: string, size: Vec2) {
        if (ChipType.IsStandard(type)) return;
        console.log("Set Size", type, size);
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        data.size.x = Math.min(Math.max(size.x, 1), type != ChipType.BaseChip ? ChipType.maxSize.x : 9);
        data.size.y = Math.min(Math.max(size.y, 1), type != ChipType.BaseChip ? ChipType.maxSize.y : 5);
        data.inputs.length = data.size.x + 1;
        data.outputs.length = data.size.x + 1;
        data.content.setSize({ x: data.size.x * ChipType.ChipScaleFactor, y: data.size.y * ChipType.ChipScaleFactor });
        ChipType.types[type] = data;
        ChipType.Save();
    }

    public static SetInput(type: string, index: number, name: string) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        name = name.toUpperCase();
        if (index >= 0 && index < data.inputs.length && (data.inputs.indexOf(name) < 0 || name.length < 1)) {
            data.inputs[index] = name;
        }
        ChipType.types[type] = data;
        ChipType.Save();
    }

    public static SetOutput(type: string, index: number, name: string) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        name = name.toUpperCase();
        if (index >= 0 && index < data.outputs.length && (data.outputs.indexOf(name) < 0 || name.length < 1)) {
            data.outputs[index] = name;
        }
        ChipType.types[type] = data;
        ChipType.Save();
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

}

interface ChipTypeData {
    size: Vec2;
    inputs: string[];
    outputs: string[];
    constants: string[];
    code: string | null;
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

    public static Factory(id: string, type: string, pos: Vec2 = { x: 1, y: 1 }): Chip {
        return new Chip(id, type, pos);
    }

    constructor(id: string, type: string, pos: Vec2 = { x: 1, y: 1 }) {
        this.type = type;
        ChipType.New(type);
        this._id = id.toLowerCase();
        this._pos = { ...pos };
    }

    public get id(): string { return this._id; }

    public get name(): string { return this._name.length < 1 ? (this.isStandard ? this.type.toUpperCase() : this.type) : this._name; }
    public set name(name: string) { this._name = name; }

    public get type(): string { return this._type; }
    public set type(type: string) { this._type = type.toLowerCase(); }

    public get isStandard(): boolean { return ChipType.IsStandard(this.type); }
    public get content(): ChipContent { return this.getData().content; }
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
    public get isBaseChip(): boolean { return this.type == ChipType.BaseChip; }

    public get rect(): Rect {
        const size = this.size;
        return {
            left: this.pos.x,
            right: this.pos.x + size.x,
            top: this.pos.y,
            bottom: this.pos.y + size.y,
        };
    }

    public rectGridScale(gridScale: number) {
        const rect = this.rect;
        rect.left *= gridScale;
        rect.right *= gridScale;
        rect.top *= gridScale;
        rect.bottom *= gridScale;
        return rect;
    }

    public fromJSON(data: { [k: string]: any }): Chip {
        this._id = (data.id ?? this.id).toLowerCase();
        this._pos = { ...(data.pos ?? this.pos) };
        this.name = data.name ?? this.name;
        this._type = data.type ?? this.type;
        this._constants = { ...(data.constants ?? this.constants) };
        return this;
    }


    public toJSON(): { [k: string]: any } {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            pos: this.pos,
            constants: this.constants,
        };
    }

    intersects(other: Rect, pad: number = 0.5): number {
        return Rectangle.Intersect(
            Rectangle.Pad(other, pad),
            Rectangle.Pad(this.rect, pad)
        );
    }

    intersectsChip(chip: Chip, pad: number = 0.5): number {
        return this.intersects(chip.rect, pad);
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
        return Vector2.Multiply(this._pos, gridScale);
    }

    public gridSize(gridScale: number): Vec2 {
        return Vector2.Multiply(this.size, gridScale);
    }

    // public chipBounds(gridScale: number, edge: number = 0): [Vec2, Vec2] {
    //     const pos = this.gridPos(gridScale);
    //     const size = this.gridSize(gridScale);
    //     edge = Math.floor(gridScale * edge);
    //     size.x += pos.x + edge;
    //     size.y += pos.y + edge
    //     pos.x -= edge;
    //     pos.y -= edge;
    //     return [pos, size];
    // }

    public clamp2Grid(gridSize: Vec2) {
        this._pos = Vector2.ClampVec(this.pos, { x: 0, y: 0 }, { x: gridSize.x - this.size.x, y: gridSize.y - this.size.y });
    }

    public getPinAtPos(pos: Vec2): ChipPin | null {

        const pRect = Rectangle.Pad(Rectangle.FromVec2(pos), 0.1);

        for (const input of this.inputs) {
            const pin = this.getInputPin(input);
            if (pin) {
                const pinPos = this.getPinPos(pin);
                pinPos.y -= 0.375;
                const rect = Rectangle.Pad(Rectangle.FromVec2(pinPos), 0.1);
                if (Rectangle.Intersect(pRect, rect)) return pin;
            }
        }
        for (const output of this.outputs) {
            const pin = this.getOutputPin(output);
            if (pin) {
                const pinPos = this.getPinPos(pin);
                pinPos.y += 0.375;
                const rect = Rectangle.Pad(Rectangle.FromVec2(pinPos), 0.1);
                if (Rectangle.Intersect(pRect, rect)) return pin;
            }
        }

        return null;
    }

    public getPinPos(pin: ChipPin): Vec2 {
        const pos: Vec2 = { x: 0, y: 0 };
        const index = pin.output ? this.outputs.indexOf(pin.name) : this.inputs.indexOf(pin.name);
        if (index >= 0) {
            if (this.isBaseChip) {
                pos.y = pin.output ? this.content.size.y : 0;
                pos.x = index * ChipType.ChipScaleFactor;
            }
            else {
                const rect = this.rect;

                pos.y = pin.output ? rect.bottom : rect.top;

                pos.x = rect.left + index;
            }
        }
        return pos;
    }

    public getOutputPin(pin: string): ChipPin | null {
        return this.getPin(pin, true);
    }

    public getInputPin(pin: string): ChipPin | null {
        return this.getPin(pin, false);
    }

    public getPin(pin: string, output: boolean): ChipPin | null {
        if (output) {
            if (this.outputs.indexOf(pin) < 0) return null;
        } else {
            if (this.inputs.indexOf(pin) < 0) return null;
        }
        return new ChipPin(this.id, output, pin);
    }

}

export class ChipContent {
    private _chips: { [k: string]: Chip } = {};
    private _connections: Connection[] = [];
    private _size!: Vec2;

    public get connections(): Connection[] { return [...this._connections]; }
    public get chips(): Chip[] { return Object.values(this._chips); }
    public get size(): Vec2 { return { ...this._size }; }

    public static Factory(size: Vec2): ChipContent {
        return new ChipContent(size);
    }

    constructor(size: Vec2) {
        this.setSize(size);
    }

    public fromJSON(data: { [k: string]: any }): ChipContent {
        (data.chips ?? []).forEach((chip: { [k: string]: any }) => {
            this._chips[chip.id] = Chip.Factory(chip.id, chip.type, chip.pos).fromJSON(chip);
        });
        (data.connections ?? []).forEach((con: { [k: string]: any }) => {
            this._connections.push(Connection.Factory().fromJSON(con));
        });
        return this;
    }

    public toJSON(): { [k: string]: any } {
        return {
            chips: this.chips,
            connections: this.connections,
        };
    }

    setSize(size: Vec2) {
        this._size = { ...size };
    }

    public getChip(id: string): Chip | null {
        return this._chips[id] ?? null;
    }

    public addChip(chip: Chip) {
        if (chip.size.x > ChipType.maxSize.x || chip.size.y > ChipType.maxSize.y) return false;
        if (this._chips.hasOwnProperty(chip.id)) return false;
        this._chips[chip.id] = chip;
        ChipType.Save();
        return true;
    }

    public removeChip(id: string) {
        if (this._chips.hasOwnProperty(id)) {
            delete this._chips[id];
            this._connections = this._connections.filter(connection => connection.source.chip != id && connection.target.chip != id);
            ChipType.Save();
        }
    }

    public updateConnectionsForChip(chip: Chip) {
        const connections = this.connections.filter(con => con.usesChip(chip) || !con.customPath);
        connections.forEach(con => con.clearPath());
        connections.sort((a, b) => a.distance(this) - b.distance(this));
        connections.forEach(con => this.updatePathForConnection(con));
    }

    private updatePathForConnection(con: Connection) {
        const start = this.getChip(con.source.chip)?.getPinPos(con.source);
        const end = this.getChip(con.target.chip)?.getPinPos(con.target);
        if (start && end) {
            start.y += con.source.output ? 1 : -1;
            end.y += con.target.output ? 1 : -1;

            const grid = this.getGridMatrix(con);
            const AStar = new AStarFinder({
                grid: {
                    matrix: grid,
                },
                diagonalAllowed: false,
            });

            try {
                const path = AStar.findPath(start, end).map(p => { return { x: p[0], y: p[1] }; });
                con.setPath(path);
                con.validPath = path.length > 0;
            } catch (e) {
                con.validPath = false;
            }
        }
    }

    public pinIsConnected(pin: ChipPin): boolean {
        return this.connections.find(con => con.usesPin(pin)) !== undefined;
    }

    public disconnect(pin: ChipPin) {
        this._connections = this._connections.filter(con => !con.usesPin(pin));
    }

    public connect(pinA: ChipPin, pinB: ChipPin, layer: number = 0): boolean {
        for (const con of this.connections) {
            if (con.usesPin(pinA) || con.usesPin(pinB)) return false;
        }
        console.log("NOT YET CONNECTED", this.getChip(pinA.chip)?.isBaseChip, this.getChip(pinB.chip)?.isBaseChip);
        if (pinA.output == pinB.output && !(this.getChip(pinA.chip)?.isBaseChip || this.getChip(pinB.chip)?.isBaseChip)) return false;
        console.log("O 2 O PASS");
        const connection = new Connection();
        connection.layer = layer;
        connection.source = pinA;
        connection.target = pinB;
        this.updatePathForConnection(connection);
        this._connections.push(connection);
        return true;
    }

    public getGridMatrix(calcCon: Connection): number[][] {
        const grid: number[][] = [];
        for (let y = 0; y <= this.size.y; y++) {
            const line: number[] = [];
            for (let x = 0; x <= this.size.x; x++) {
                line[x] = 0;
            }
            grid.push(line);
        };

        const cons = this.connections.filter(con => con.layer == calcCon.layer && con.id !== calcCon.id);
        //console.log(calcCon.id, "GridIncludes", cons.map(con => con.id));
        cons.forEach(con => {
            con.path.forEach(p => {
                grid[p.y][p.x] = 1;
            });
        });

        this.chips.forEach(chip => {
            const pos = chip.pos;
            const size = chip.size;
            for (let y = 0; y <= size.y; y++) {
                for (let x = 0; x <= size.x; x++) {
                    grid[pos.y + y][pos.x + x] = 1;
                }
            }
        });
        return grid;
    }
}

export class Connection {
    public layer: number = 0;
    private _path: Vec2[] = [];
    private _source: ChipPin = new ChipPin();
    private _target: ChipPin = new ChipPin();
    public validPath: boolean = false;
    public customPath: boolean = false;

    public get id(): string {
        return `${this.source.id}>${this.target.id}`;
    }

    public static Factory(): Connection {
        return new Connection();
    }

    public usesChip(chip: Chip): boolean {
        return this.source.chip == chip.id || this.target.chip == chip.id;
    }

    public usesPin(pin: ChipPin): boolean {
        return this.source.isEqualTo(pin) || this.target.isEqualTo(pin);
    }

    public toJSON(): { [k: string]: any } {
        return {
            layer: this.layer,
            path: this.path,
            source: this.source,
            target: this.target,
        };
    }

    clearPath(): Connection {
        return this.setPath([]);
    }

    setPath(path: Vec2[]): Connection {
        this._path = [...path];
        return this;
    }

    distance(content: ChipContent): number {
        const src = content.getChip(this.source.chip)?.getPinPos(this.source);
        const trg = content.getChip(this.target.chip)?.getPinPos(this.target);
        if (src && trg) {
            return Vector2.DistanceSquared(src, trg);
        }
        return 1000000;
    }

    public fromJSON(data: { [k: string]: any }): Connection {
        this.layer = data.layer ?? this.layer;
        this._path = [...(data.path ?? this.path)];
        this._source = ChipPin.Factory().fromJSON(data.source ?? {});
        this._target = ChipPin.Factory().fromJSON(data.target ?? {});
        return this;
    }

    public get source(): ChipPin { return this._source; }
    public set source(connector: ChipPin) { this._source = connector; }
    public get target(): ChipPin { return this._target; }
    public set target(connector: ChipPin) { this._target = connector; }
    public get path(): Vec2[] { return [...this._path]; }
}

export class ChipPin {
    private _chip: string;
    private _output: boolean;
    private _name: string;


    public get id(): string {
        return `${this.chip}_${this.output}_${this.name}`;
    }

    public static Factory(chip: string = "", output: boolean = false, name: string = ""): ChipPin {
        return new ChipPin(chip, output, name);
    }

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

    public fromJSON(data: { [k: string]: any }): ChipPin {
        this._chip = data.chip ?? this.chip;
        this._output = data.output ?? this.output;
        this._name = data.name ?? this.name;
        return this;
    }

    public isEqualTo(pin: ChipPin): boolean {
        return this.chip == pin.chip && this.output == pin.output && this.name == pin.name;
    }

    public get chip(): string { return this._chip; }
    public get output(): boolean { return this._output; }
    public get name(): string { return this._name; }
}