import { Line, line, rect, Rect, vec2, Vec2 } from "../common/Transform";
import standardChips from "../common/StandardChips.json";
import { AStarFinder } from "astar-typescript-cost";


window.addEventListener("beforeunload", () => { ChipType.Save(); });

export class ChipType {
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
                content: new ChipContent({ x: raw.size.x * ChipType.ChipScaleFactor, y: raw.size.y * ChipType.ChipScaleFactor }),
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
            content: ChipContent.Factory({ x: size.x * ChipType.ChipScaleFactor, y: size.y * ChipType.ChipScaleFactor }).fromJSON(chipData.content ?? {}),
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

    public static SetSize(type: string, size: vec2) {
        if (ChipType.IsStandard(type)) return;
        type = type.toLowerCase();
        const data = ChipType.GetData(type);
        data.size.x = Math.min(Math.max(size.x, 1), type != ChipType.BaseChip ? ChipType.maxSize.x : 9);
        data.size.y = Math.min(Math.max(size.y, 1), type != ChipType.BaseChip ? ChipType.maxSize.y : 5);
        ChipType.SetType(type, data)
            .content.setSize({ x: data.size.x * ChipType.ChipScaleFactor, y: data.size.y * ChipType.ChipScaleFactor });
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
        data.constants = data.constants.map(c => c.toUpperCase());

        return data;
    }

}

interface ChipTypeData {
    size: vec2;
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
    private _pos: vec2 = { x: 0, y: 0 };
    private _type: string = "AND";
    private _name: string = "";

    private _constants: { [k: string]: number | string } = {};

    public static Factory(id: string, type: string, pos: vec2 = { x: 1, y: 1 }): Chip {
        return new Chip(id, type, pos);
    }

    constructor(id: string, type: string, pos: vec2 = { x: 1, y: 1 }) {
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
    public get size(): vec2 { return { ...this.getData().size }; }
    public get pos(): vec2 { return { ...this._pos }; }
    public get description(): string { return this.getData().description; }
    public get constants(): { [k: string]: number | string } {
        const consts: { [k: string]: number | string } = {};
        this.getData().constants.forEach(key => consts[key] = this._constants[key] ?? "");
        return consts;
    };
    public get isBaseChip(): boolean { return this.type == ChipType.BaseChip; }

    public get rect(): rect {
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

    intersects(other: rect, pad: number = 0.5): number {
        return Rect.Intersect(
            Rect.Pad(other, pad),
            Rect.Pad(this.rect, pad)
        );
    }

    intersectsChip(chip: Chip, pad: number = 0.5): number {
        return this.intersects(chip.rect, pad);
    }

    getData(): ChipTypeData {
        return ChipType.GetData(this.type);
    }

    public setPos(pos: vec2, gridSize: vec2): Chip {
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

    setSize(size: vec2): Chip {
        ChipType.SetSize(this.type, size);
        return this;
    }

    setConstant(key: string, value: string | number) {
        if (this.getData().constants.indexOf(key) >= 0) {
            this._constants[key] = value;
        }
    }


    public gridPos(gridScale: number): vec2 {
        return Vec2.Multiply(this._pos, gridScale);
    }

    public gridSize(gridScale: number): vec2 {
        return Vec2.Multiply(this.size, gridScale);
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

    public clamp2Grid(gridSize: vec2) {
        this._pos = Vec2.ClampVec(this.pos, { x: 0, y: 0 }, { x: gridSize.x - this.size.x, y: gridSize.y - this.size.y });
    }

    public getPinAtPos(pos: vec2): ChipPin | null {

        const pRect = Rect.Pad(Rect.FromVec2(pos), 0.1);

        for (const input of this.inputs) {
            const pin = this.getInputPin(input);
            if (pin) {
                const pinPos = this.getPinPos(pin);
                pinPos.y -= this.isBaseChip ? 1 : 0.375;
                const rect = Rect.Pad(Rect.FromVec2(pinPos), this.isBaseChip ? 0.25 : 0.1);
                if (Rect.Intersect(pRect, rect)) return pin;
            }
        }
        for (const output of this.outputs) {
            const pin = this.getOutputPin(output);
            if (pin) {
                const pinPos = this.getPinPos(pin);
                pinPos.y += this.isBaseChip ? 1 : 0.375;
                const rect = Rect.Pad(Rect.FromVec2(pinPos), this.isBaseChip ? 0.25 : 0.1);
                if (Rect.Intersect(pRect, rect)) return pin;
            }
        }

        return null;
    }

    public getPinPos(pin: ChipPin): vec2 {
        const pos: vec2 = { x: 0, y: 0 };
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
    private _size!: vec2;
    private parentChip: Chip | null = null;

    public get connections(): Connection[] { return [...this._connections]; }
    public get chips(): Chip[] { return Object.values(this._chips); }
    public get size(): vec2 { return { ...this._size }; }

    public static Factory(size: vec2): ChipContent {
        return new ChipContent(size);
    }

    constructor(size: vec2) {
        this.setSize(size);
    }

    setParentChip(chip: Chip) {
        this.parentChip = chip;
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

    setSize(size: vec2) {
        this._size = { ...size };
        this.chips.forEach(chip => chip.clamp2Grid(this.size));
        this.updateConnectionsForChip(null);
    }

    public getChip(id: string): Chip | null {
        if (this.parentChip && id == this.parentChip.id) return this.parentChip;
        return this._chips[id] ?? null;
    }

    public addChip(chip: Chip) {
        if (chip.size.x > ChipType.maxSize.x || chip.size.y > ChipType.maxSize.y) return false;
        if (this._chips.hasOwnProperty(chip.id)) return false;
        this._chips[chip.id] = chip;
        ChipType.Save();
        return true;
    }

    public removeChip(chip: Chip) {
        if (this._chips.hasOwnProperty(chip.id)) {
            this.disconnectChip(chip);
            delete this._chips[chip.id];
            ChipType.Save();
        }
    }

    public updateConnectionsForChip(chip: Chip | null) {
        let connections = this.connections.filter(con => (chip == null || con.usesChip(chip)) || !con.customPath);
        connections.forEach(con => con.clearPath());
        connections.sort((a, b) => a.distance(this) - b.distance(this));
        connections.forEach(con => this.updatePathForConnection(con));
    }

    private updatePathForConnection(con: Connection) {
        const sChip = this.getChip(con.source.chip);
        const eChip = this.getChip(con.target.chip);
        const start = sChip?.getPinPos(con.source);
        const end = eChip?.getPinPos(con.target);
        if (start && end && sChip && eChip) {
            start.y += con.source.output ? 1 : -1;
            end.y += con.target.output ? 1 : -1;

            const grid = this.getGridMatrix(con);
            const AStar = new AStarFinder({
                grid: {
                    matrix: grid,
                    maxCost: 10,
                },
                //heuristic: "Euclidean",
                diagonalAllowed: false,
            });

            if (sChip.isBaseChip) start.y = Math.max(Math.min(start.y, this.size.y), 0);
            if (eChip.isBaseChip) end.y = Math.max(Math.min(end.y, this.size.y), 0);

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

    public disconnectChip(chip: Chip) {
        this._connections = this._connections.filter(con => !con.usesChip(chip));
    }

    public connect(pinA: ChipPin, pinB: ChipPin, layer: number = 0): boolean {
        for (const con of this.connections) {
            if (con.usesPin(pinA) || con.usesPin(pinB)) return false;
        }
        const chipA = this.getChip(pinA.chip);
        const chipB = this.getChip(pinB.chip);

        if (chipA && chipB) {
            const bothAreBase = (chipA.isBaseChip && chipB.isBaseChip);
            const oneIsBase = (chipA.isBaseChip || chipB.isBaseChip) && !bothAreBase;
            if (oneIsBase) {
                if (pinA.output != pinB.output) return false;
            } else if (pinA.output == pinB.output) return false;

            if (bothAreBase) console.log("BOTH BASE", { [pinA.name]: pinA.output, [pinB.name]: pinB.output });
            if (bothAreBase) {
                if (pinA.output) {
                    const pinS = pinA;
                    pinA = pinB;
                    pinB = pinS;
                }
            } else if (oneIsBase) {
                if (pinA.output) {
                    if (chipA.isBaseChip) {
                        const pinS = pinA;
                        pinA = pinB;
                        pinB = pinS;
                    }
                } else {
                    if (chipB.isBaseChip) {
                        const pinS = pinA;
                        pinA = pinB;
                        pinB = pinS;
                    }
                }
            } else if (!pinA.output) {
                const pinS = pinA;
                pinA = pinB;
                pinB = pinS;
            }
            if (bothAreBase) console.log("BOTH BASE", { [pinA.name]: pinA.output, [pinB.name]: pinB.output });

            const connection = new Connection();
            connection.layer = layer;
            connection.source = pinA;
            connection.target = pinB;
            this.updatePathForConnection(connection);
            this._connections.push(connection);
            return true;
        }
        return false;
    }

    public connectionAtPos(pos: vec2): Connection | null {
        const rect = Rect.FromPosAndPad(pos, 0.1);
        for (const con of this._connections) {
            if (con.pathIntersectsRect(rect)) return con;
        }
        return null;
    }

    public getConnection(id: string): Connection | null {
        return this._connections.find(con => con.id == id) ?? null;
    }

    public getGridMatrix(calcCon: Connection | null): number[][] {
        const grid: number[][] = [];
        for (let y = 0; y <= this.size.y; y++) {
            const line: number[] = [];
            for (let x = 0; x <= this.size.x; x++) {
                line[x] = 0;
            }
            grid.push(line);
        };

        let cons = this.connections;
        if (calcCon) {
            cons = cons.filter(con => con.layer == calcCon.layer && con.id !== calcCon.id);
        }
        //console.log(calcCon.id, "GridIncludes", cons.map(con => con.id));
        cons.forEach(con => {
            con.path.forEach(p => {
                grid[p.y][p.x] = 10;
            });
        });

        this.chips.forEach(chip => {
            const pos = chip.pos;
            const size = chip.size;
            for (let x = 0; x <= size.x; x++) {
                if ((pos.y - 1) >= 0 && grid[pos.y - 1][pos.x + x] < 10 && chip.inputs[x].length) grid[pos.y - 1][pos.x + x] = 9;
                if ((pos.y + 1 + size.y) < grid.length && grid[pos.y + 1 + size.y][pos.x + x] < 10 && chip.outputs[x].length) grid[pos.y + 1 + size.y][pos.x + x] = 9;
                for (let y = 0; y <= size.y; y++) {
                    grid[pos.y + y][pos.x + x] = 10;
                }
            }
        });
        return grid;
    }
}

export class Connection {
    public layer: number = 0;
    private _path: vec2[] = [];
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
            customPath: this.customPath,
        };
    }

    public pathIntersectsRect(rect: rect): boolean {
        for (const line of this.pathLine) {
            if (Line.IntersectRect(line, rect)) return true;
        }
        return false;
    }

    public get pathLine(): line[] {
        const line: line[] = [];
        for (let i = 1; i < this._path.length; i++) {
            line.push({
                start: this._path[i - 1],
                end: this._path[i]
            });
        }
        return line;
    }

    clearPath(): Connection {
        return this.setPath([]);
    }

    setPath(path: vec2[]): Connection {
        this._path = [...path];
        return this;
    }

    distance(content: ChipContent): number {
        const src = content.getChip(this.source.chip)?.getPinPos(this.source);
        const trg = content.getChip(this.target.chip)?.getPinPos(this.target);
        if (src && trg) {
            return Vec2.DistanceSquared(src, trg);
        }
        return 1000000;
    }

    public fromJSON(data: { [k: string]: any }): Connection {
        this.layer = data.layer ?? this.layer;
        this._path = [...(data.path ?? this.path)];
        this._source = ChipPin.Factory().fromJSON(data.source ?? {});
        this._target = ChipPin.Factory().fromJSON(data.target ?? {});
        this.customPath = data.customPath ?? false;
        return this;
    }

    public get source(): ChipPin { return this._source; }
    public set source(connector: ChipPin) { this._source = connector; }
    public get target(): ChipPin { return this._target; }
    public set target(connector: ChipPin) { this._target = connector; }
    public get path(): vec2[] { return [...this._path]; }
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