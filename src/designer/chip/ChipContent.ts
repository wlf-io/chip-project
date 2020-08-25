import { vec2, Vec2, Rect } from "../../common/Transform";
import Connection from "./Connection";
import Chip from "./Chip";
import ChipType from "./ChipType";
import Pin from "./Pin";
import { AStarFinder } from "astar-typescript-cost";

export default class ChipContent {
    private _chips: { [k: string]: Chip } = {};
    private _connections: Connection[] = [];
    private _size!: vec2;
    private parentChip: Chip | null = null;

    public get connections(): Connection[] { return [...this._connections]; }
    public get chips(): Chip[] { return Object.values(this._chips); }
    public get size(): vec2 { return { x: this._size.x * ChipType.ChipScaleFactor, y: this._size.y * ChipType.ChipScaleFactor }; }

    public static Factory(size: vec2): ChipContent {
        return new ChipContent(size);
    }

    public get errors(): string[] {
        return [
            ...this._connections.filter(con => !con.validPath).map(con => `Invalid Connection ${con.id}`),
            ...this.chipErrors,
            ... this.childErrors,
        ];
    }

    public get childErrors(): string[] {
        const chips = this.chips.filter(chip => (!chip.isStandard && chip.size.x < this._size.x && chip.size.y < this._size.y));
        return [...chips.map(chip => chip.errors).reduce((p, c) => [...p, ...c], [])]
    }

    public get chipErrors(): string[] {
        return [
            ...this.chips.filter(chip => {
                return (Vec2.Area(chip.size) >= Vec2.Area(this._size)) && !chip.isStandard;
            }).map(chip => `Chip Too Large ${chip.id}`)
        ]
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

    public toJSON(): any {
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
        if (Vec2.Magnitude(chip.size) >= Vec2.Magnitude(this._size) && !chip.isStandard) {
            alert("Chip too large" + JSON.stringify([this._size, chip.size]));
            return false;
        }
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
        ChipType.Save();
    }

    private updatePathForConnection(con: Connection) {
        const sChip = this.getChip(con.source.chip);
        const eChip = this.getChip(con.target.chip);
        let start = sChip?.getPinPos(con.source);
        let end = eChip?.getPinPos(con.target);
        if (start && end && sChip && eChip) {
            const oStart = { ...start };
            //const oEnd = { ...end };
            start = Vec2.Sum(start, sChip.getPinPosOutOffset(con.source));
            end = Vec2.Sum(end, eChip.getPinPosOutOffset(con.target));


            if (Vec2.Equal(start, end)) {
                con.setPath([start]);
                con.validPath = true;
            }
            else if (start.x == end.x) {
                if (oStart.y == end.y) {
                    con.validPath = true;
                    return;
                }
            }
            else if (start.y == end.y) {
                if (oStart.x == end.x) {
                    con.validPath = true;
                    return;
                }
            }

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

    public pinIsConnected(pin: Pin): boolean {
        return this.connections.find(con => con.usesPin(pin)) !== undefined;
    }

    public disconnect(pin: Pin) {
        this._connections = this._connections.filter(con => !con.usesPin(pin));
    }

    public disconnectChip(chip: Chip) {
        this._connections = this._connections.filter(con => !con.usesChip(chip));
    }

    public connect(pinA: Pin, pinB: Pin, layer: number = 0): boolean {
        const chipA = this.getChip(pinA.chip);
        const chipB = this.getChip(pinB.chip);
        if (chipA == null || chipB == null) return false;
        for (const con of this.connections) {
            if (con.usesPin(pinA)) {
                if (chipA.isBaseChip) {
                    if (pinA.output) return false;
                } else {
                    if (!pinA.output) return false;
                }
            }
            if (con.usesPin(pinB)) {
                if (chipB.isBaseChip) {
                    if (pinB.output) return false;
                } else {
                    if (!pinB.output) return false;
                }
            }
        }

        const bothAreBase = (chipA.isBaseChip && chipB.isBaseChip);
        const oneIsBase = (chipA.isBaseChip || chipB.isBaseChip) && !bothAreBase;
        if (oneIsBase) {
            if (pinA.output != pinB.output) return false;
        } else if (pinA.output == pinB.output) return false;

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

        const connection = new Connection();
        connection.layer = layer;
        connection.source = pinA;
        connection.target = pinB;
        this.updatePathForConnection(connection);
        this._connections.push(connection);
        return true;

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
            cons = cons.filter(con => con.layer == calcCon.layer && con.id !== calcCon.id && !calcCon.source.isEqualTo(con.source));
        }
        cons.forEach(con => {
            con.path.forEach(p => {
                if (p.y >= grid.length || p.y < 0) return;
                if (p.x >= grid[0].length || p.x < 0) return;
                grid[p.y][p.x] = 10;
            });
        });

        this.chips.forEach(chip => {
            const pos = chip.pos;
            let size = chip.size;
            const isRotate = chip.rotation % 2;
            if (isRotate) size = Vec2.Swap(size);
            for (let x = 0; x <= size.x; x++) {
                // if ((pos.y - 1) >= 0 && grid[pos.y - 1][pos.x + x] < 10 && chip.inputs[isRotate ? y : x].length) grid[pos.y - 1][pos.x + x] = 9;
                // if ((pos.y + 1 + size.y) < grid.length && grid[pos.y + 1 + size.y][pos.x + x] < 10 && chip.outputs[x].length) grid[pos.y + 1 + size.y][pos.x + x] = 9;
                for (let y = 0; y <= size.y; y++) {
                    grid[pos.y + y][pos.x + x] = 10;
                }
            }
            for (const o of chip.outputs) {
                const pin = chip.getOutputPin(o);
                if (pin) {
                    const pinPos = chip.getPinPosOut(pin);
                    if (grid.length > pinPos.y && pinPos.y >= 0) {
                        const line = grid[pinPos.y];
                        if (line.length > pinPos.x && pinPos.x >= 0 && line[pinPos.x] < 10) {
                            line[pinPos.x] = 9;
                        }
                    }
                }
            }
            for (const i of chip.inputs) {
                const pin = chip.getInputPin(i);
                if (pin) {
                    const pinPos = chip.getPinPosOut(pin);
                    if (grid.length > pinPos.y && pinPos.y >= 0) {
                        const line = grid[pinPos.y];
                        if (typeof line == "undefined") {
                            console.error(chip.id, grid, pinPos);
                            break;
                        }
                        if (line.length > pinPos.x && pinPos.x >= 0 && line[pinPos.x] < 10) {
                            line[pinPos.x] = 9;
                        }
                    }
                }
            }
        });
        return grid;
    }
}
