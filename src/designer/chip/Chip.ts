import { rect, Rect, vec2, Vec2 } from "../../common/Transform";
import { Pin, ChipType, ChipContent, Connection } from "./index";
import { ChipTypeData } from "./ChipType";
import { ChipData as BaseChipData } from "../../common/interfaces/source.interfaces";


interface ChipData extends BaseChipData {
    pos: vec2;
    rotation: number;
}

export default class Chip {
    private _id: string;
    private _pos: vec2 = { x: 0, y: 0 };
    private _type: string = "AND";
    private _name: string = "";
    private _rotation: number = 0;

    private _constants: { [k: string]: number | string } = {};

    public static Factory(id: string, type: string, pos: vec2 = { x: 1, y: 1 }): Chip {
        return new Chip(id, type, pos);
    }

    constructor(id: string, type: string, pos: vec2 = { x: 1, y: 1 }) {
        this.type = type;
        ChipType.New(type);
        this._id = id.toLowerCase();
        this._pos = { ...pos };
        if (this.isBaseChip) this.content.setParentChip(this);
    }

    public get id(): string { return this._id; }

    public get name(): string { return this._name.length < 1 ? (this.isStandard ? this.type.toUpperCase() : this.type) : this._name; }
    public set name(name: string) { this._name = name; }

    public get type(): string { return this._type; }
    public set type(type: string) { this._type = type.toLowerCase(); }

    public get isStandard(): boolean { return ChipType.IsStandard(this.type); }
    private get content(): ChipContent { return this.getData().content; }
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

    public get chips(): Chip[] { return this.content.chips; }
    public get connections(): Connection[] { return this.content.connections; }
    public get innerSize(): vec2 { return this.content.size; }

    public get rotation(): number { return this._rotation; }
    public set rotation(rot: number) {
        while (rot < 0) rot += 4;
        while (rot > 3) rot -= 4;
        this._rotation = rot;
    }

    public removeChip(chip: Chip) {
        this.content.removeChip(chip);
        ChipType.SaveType(this.type);
    }

    public addChip(chip: Chip) {
        this.content.addChip(chip);
        ChipType.SaveType(this.type);
    }

    public connectionAtPos(pos: vec2): Connection | null {
        return this.content.connectionAtPos(pos);
    }

    public updateConnections() {
        this.content.updateConnections();
        ChipType.SaveType(this.type);
    }

    public disconnect(pin: Pin) {
        this.content.disconnect(pin);
        ChipType.SaveType(this.type);
    }

    public connect(pinA: Pin, pinB: Pin, layer?: number) {
        this.content.connect(pinA, pinB, layer);
        ChipType.SaveType(this.type);
    }

    public rotate(rot: number = 1) {
        this.rotation = this.rotation + Math.round(rot);
    }

    public get isBaseChip(): boolean { return this.type == ChipType.BaseChip; }

    public get errors(): string[] {
        return [
            ...this.content.errors
        ]
    }

    public get rect(): rect {
        const size = this.size;
        const isRot = this.rotation % 2;
        return {
            left: this.pos.x,
            right: this.pos.x + (isRot ? size.y : size.x),
            top: this.pos.y,
            bottom: this.pos.y + (isRot ? size.x : size.y),
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
        this._rotation = data.rotation ?? 0;
        return this;
    }

    public toJSON(): ChipData {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            pos: this.pos,
            constants: this.constants,
            rotation: this.rotation,
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

    public addConst(constant: string) {
        ChipType.AddConst(this.type, constant);
    }

    public removeConst(constant: string) {
        ChipType.RemoveConst(this.type, constant);
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
        ChipType.SaveType(this.type);
    }

    public getGridMatrix(calcCon: Connection | null) {
        return this.content.getGridMatrix(calcCon);
    }

    public getChip(chipID: string): Chip | null {
        return this.content.getChip(chipID);
    }

    public getPinAtPos(pos: vec2): Pin | null {

        const pRect = Rect.Pad(Rect.FromVec2(pos), 0.1);

        for (const input of this.inputs) {
            const pin = this.getInputPin(input);
            if (pin) {
                const pinPos = this.getPinPosOut(pin, this.isBaseChip ? 1 : 0.375);
                const rect = Rect.Pad(Rect.FromVec2(pinPos), this.isBaseChip ? 0.25 : 0.1);
                if (Rect.Intersect(pRect, rect)) return pin;
            }
        }
        for (const output of this.outputs) {
            const pin = this.getOutputPin(output);
            if (pin) {
                const pinPos = this.getPinPosOut(pin, this.isBaseChip ? 1 : 0.375);
                const rect = Rect.Pad(Rect.FromVec2(pinPos), this.isBaseChip ? 0.25 : 0.1);
                if (Rect.Intersect(pRect, rect)) return pin;
            }
        }

        return null;
    }

    public clone(): Chip {
        const chip: Chip = new Chip(`${this.type}_${Date.now()}`, this.type, this.pos);
        chip.rotation = this.rotation;
        Object.entries(this.constants).forEach(([name, val]) => {
            chip.setConstant(name, val);
        });
        chip.name = this._name;
        return chip;
    }

    public getPinPos(pin: Pin): vec2 {
        const pos: vec2 = { x: 0, y: 0 };
        const index = pin.output ? this.outputs.indexOf(pin.name) : this.inputs.indexOf(pin.name);
        if (index >= 0) {
            if (this.isBaseChip) {
                pos.y = pin.output ? this.content.size.y : 0;
                pos.x = index * ChipType.ChipScaleFactor;
            }
            else {
                const rect = this.rect;

                switch (this.rotation) {
                    case 1:
                        pos.x = pin.output ? rect.left : rect.right;
                        pos.y = rect.top + index;
                        break;
                    case 2:
                        pos.x = rect.right - index;
                        pos.y = pin.output ? rect.top : rect.bottom;
                        break;
                    case 3:
                        pos.x = pin.output ? rect.right : rect.left;
                        pos.y = rect.bottom - index;
                        break;
                    default:
                        pos.y = pin.output ? rect.bottom : rect.top;
                        pos.x = rect.left + index;
                        break;
                }
            }
        }
        return pos;
    }

    public getPinPosOutOffset(pin: Pin, multiplier: number = 1) {
        const pos = { x: 0, y: 0 };
        if (this.isBaseChip) {
            pos.y = pin.output ? 1 : -1;
            return pos;
        }
        switch (this.rotation) {
            case 1:
                pos.x -= pin.output ? 1 : -1;
                break;
            case 2:
                pos.y -= pin.output ? 1 : -1;
                break;
            case 3:
                pos.x += pin.output ? 1 : -1;
                break;
            default:
                pos.y += pin.output ? 1 : -1;
                break;
        }
        return Vec2.Multiply(pos, multiplier);
    }

    public getPinPosOut(pin: Pin, multiplier: number = 1): vec2 {
        return Vec2.Sum(this.getPinPosOutOffset(pin, multiplier), this.getPinPos(pin));
    }

    public getOutputPin(pin: string): Pin | null {
        return this.getPin(pin, true);
    }

    public getInputPin(pin: string): Pin | null {
        return this.getPin(pin, false);
    }

    public getPin(pin: string, output: boolean): Pin | null {
        if (pin.length < 1) return null;
        if (output) {
            if (this.outputs.indexOf(pin) < 0) return null;
        } else {
            if (this.inputs.indexOf(pin) < 0) return null;
        }
        return new Pin(this.id, output, pin);
    }

}


