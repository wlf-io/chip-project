import { ConnectionData as BaseConnectionData } from "../../common/interfaces/source.interfaces";
import { vec2, rect, line, Vec2, Line } from "../../common/Transform";
import Pin from "./Pin";
import Chip from "./Chip";
import ChipContent from "./ChipContent";

interface ConnectionData extends BaseConnectionData {
    layer: number;
    path: vec2[];
    customPath: boolean;
}

export default class Connection {
    public layer: number = 0;
    private _path: vec2[] = [];
    private _source: Pin = new Pin();
    private _target: Pin = new Pin();
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

    public usesPin(pin: Pin): boolean {
        return this.source.isEqualTo(pin) || this.target.isEqualTo(pin);
    }

    public toJSON(): ConnectionData {
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
        this._source = Pin.Factory().fromJSON(data.source ?? {});
        this._target = Pin.Factory().fromJSON(data.target ?? {});
        this.customPath = data.customPath ?? false;
        return this;
    }

    public get source(): Pin { return this._source; }
    public set source(connector: Pin) { this._source = connector; }
    public get target(): Pin { return this._target; }
    public set target(connector: Pin) { this._target = connector; }
    public get path(): vec2[] { return [...this._path]; }
}