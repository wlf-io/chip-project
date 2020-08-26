import { vec2, Vec2 } from "../common/Transform";
import { Chip, ChipType, Connection, Pin } from "./chip";
import Designer from "./Designer";

class Renderer {
    private designer: Designer;
    private _canvas: HTMLCanvasElement;
    private context!: CanvasRenderingContext2D;

    private style: StyleSet = {
        colours: {
            background: "#FFF",
            grid: {
                border: "#333",
                lines: "#DDD8",
            },
            wire: ["#900", "#090", "#009"],
            chip: {
                base: "#333",
                back: "#222",
                fore: "#444",
                pin: "#888",
                text: "#DDD",
                pinText: "#333",
            },
            highlight: "#F00",
        },
        chipEdge: 0.28,
        font: {
            size: 12,
            text: "normal bold sans-serif",
        },
        grid: {
            size: 40,
        }
    };

    private fontSize: number = 12;

    private frameTimes: number[] = [];

    constructor(designer: Designer) {
        this.designer = designer;
        this._canvas = document.createElement("canvas");
        this.canvas.classList.add("designer");
        document.body.prepend(this.canvas);
        const context = this.canvas.getContext("2d");
        if (context == null) throw "Failed to get 2d rendering context for canvas";
        else this.context = context;
    }

    public get canvas(): HTMLCanvasElement { return this._canvas; }

    public get colours(): ColourSet { return this.style.colours; }

    public get chipEdge(): number { return this.style.chipEdge; }

    public get topLeft(): vec2 { return this.designer.topLeft; }

    public get zoom(): number { return this.designer.zoom; }

    public get gridScale(): number { return this.style.grid.size * this.zoom; }

    private get mouse() { return this.designer.mouse; }

    private get gridSize(): vec2 { return this.designer.gridSize; }



    public doKonami() {
        let h = 0;
        // let rgb: { r: number, g: number, b: number };
        const background = this.colours.background;
        const int = window.setInterval(
            () => {
                h++;
                if (h > 360) {
                    this.colours.background = background;
                    window.clearInterval(int);
                } else {
                    const rgb = this.HSVtoRGB(h / 360, 1, 1);
                    this.colours.background = `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g.toString(16).padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`;
                }
            }, 10
        );
    }


    private HSVtoRGB(h: number, s: number, v: number) {
        var r = 0, g = 0, b = 0, i, f, p, q, t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    public draw(delta: number, chip: Chip): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;


        this.context.fillStyle = this.colours.background;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.textBaseline = "top";
        this.context.textAlign = "left";
        this.fontSize = Math.round(this.style.font.size * this.zoom);
        this.context.font = `${this.style.font.text} ${this.fontSize}px`;

        const gridScale = this.gridScale;
        const VX = -this.topLeft.x;
        const VY = -this.topLeft.y;

        this.drawGrid(chip, VX, VY, gridScale);
        this.drawChips(chip, VX, VY, gridScale);
        this.drawConnections(chip, VX, VY, gridScale);

        if (this.designer.debug) {
            this.drawFPSGraph(delta, { x: 0, y: this.canvas.height - 120 }, { x: 520, y: 120 });
            this.context.fillText([Object.values(this.mouse.gridPos), Object.values(this.designer.snapPos2Grid(this.mouse.gridPos))].toString(), 0, 0);
            const grid = chip.getGridMatrix(null);
            this.context.textBaseline = "middle";
            this.context.textAlign = "center";
            for (let y = 0; y < grid.length; y++) {
                const line = grid[y];
                for (let x = 0; x < line.length; x++) {
                    this.context.fillText(line[x].toString(), VX + (x * gridScale), VY + (y * gridScale));
                }
            }
            this.context.fillStyle = "#00F";
            this.context.textBaseline = "top";
            this.context.textAlign = "left";
            this.context.fillText(this.zoom.toString(), 0, this.fontSize * 2);
        }

    }

    private drawConnections(chip: Chip, VX: number, VY: number, gridScale: number) {
        chip.connections.forEach(con => {
            this.drawConnection(con, chip, VX, VY, gridScale);
        });
        if (this.mouse.draggingPin && this.designer.connectingPin) {
            const pin = this.designer.connectingPin;
            const pinChip = chip.getChip(pin.chip);
            if (pinChip) {
                const pinPos = this.getPinRenderPos(pin, pinChip, gridScale);
                if (pinChip.isBaseChip) pinPos.y += (pin.output ? 0.5 : -0.5) * gridScale;
                this.context.strokeStyle = this.colours.highlight;
                this.context.beginPath();
                this.context.moveTo(VX + pinPos.x, VY + pinPos.y);
                this.context.lineTo(this.mouse.pos.x, this.mouse.pos.y);
                this.context.stroke();
            }
        }
    }

    private getPinRenderPos(pin: Pin, chip: Chip, gridScale: number) {
        const pos = Vec2.Sum(chip.getPinPos(pin), Vec2.Multiply(chip.getPinPosOutOffset(pin), 0.4));
        return Vec2.Multiply(pos, gridScale);
    }

    private drawConnection(con: Connection, chip: Chip, VX: number, VY: number, gridScale: number) {
        const sChip = chip.getChip(con.source.chip);
        const tChip = chip.getChip(con.target.chip);
        if (sChip == null || tChip == null) return;

        if (this.mouse.draggingChip) {
            if (sChip.id == this.designer.selectedChipID || tChip.id == this.designer.selectedChipID) return;
        }
        const src: vec2 = this.getPinRenderPos(con.source, sChip, gridScale);
        const trg: vec2 = this.getPinRenderPos(con.target, tChip, gridScale);

        if (sChip.isBaseChip) src.y += (con.source.output ? 0.5 : -0.5) * gridScale;
        if (tChip.isBaseChip) trg.y += (con.target.output ? 0.5 : -0.5) * gridScale;

        this.context.setLineDash(
            (
                [
                    [3, 0, 0, 3, 0, 3],
                    [0, 3, 3, 0, 0, 3],
                    [0, 3, 0, 3, 3, 0],
                ]
            )[Math.floor(this.designer.time.total / 50) % 3]
        );


        this.context.beginPath();
        this.context.moveTo(VX + src.x, VY + src.y);
        con.path.forEach(point => this.context.lineTo(VX + (point.x * gridScale), VY + (point.y * gridScale)));
        this.context.lineTo(VX + trg.x, VY + trg.y);
        this.context.strokeStyle = con.validPath ? (this.colours.wire[con.layer] ?? "#333") : this.colours.highlight;
        this.context.stroke();
        this.context.setLineDash([]);
    }

    private drawChips(chip: Chip, VX: number, VY: number, gridScale: number) {
        chip.chips.forEach(chip => {
            if (this.mouse.draggingChip && chip.id == this.designer.selectedChipID) return;
            const chipTl = chip.gridPos(gridScale);
            chipTl.x += VX;
            chipTl.y += VY;
            this.drawChip(chip, gridScale, chipTl);
        });

        if (this.mouse.draggingChip && this.designer.selectedChip) {
            const sChip = this.designer.selectedChip;
            const chipSize = sChip.gridSize(gridScale);
            this.drawChip(sChip, gridScale, { x: this.mouse.gridPos.x + this.mouse.draggingChipOffset.x + VX - (chipSize.x * 0.5), y: this.mouse.gridPos.y + this.mouse.draggingChipOffset.y + VY - (chipSize.y * 0.5) });
        }
    }

    private drawGrid(chip: Chip, VX: number, VY: number, gridScale: number) {
        this.context.strokeStyle = this.colours.grid.lines;

        this.context.setLineDash([5, /**/3, 9, 3/**/, 0, 0, 5, 0]);
        for (let x = 0; x <= this.gridSize.x; x++) {
            this.context.beginPath();
            this.context.moveTo(VX + (gridScale * x), VY);
            this.context.lineTo(VX + (gridScale * x), VY + (gridScale * this.gridSize.y));
            this.context.stroke();
        }
        for (let y = 0; y <= this.gridSize.y; y++) {
            this.context.beginPath();
            this.context.moveTo(VX, VY + (gridScale * y));
            this.context.lineTo(VX + (gridScale * this.gridSize.x), VY + (gridScale * y));
            this.context.stroke();
        }

        this.context.moveTo(0, 0);

        this.context.setLineDash([]);
        this.context.strokeStyle = this.colours.grid.border;
        this.context.beginPath();
        this.context.moveTo(VX - gridScale, VY - gridScale);
        this.context.lineTo(VX + (gridScale * this.gridSize.x) + gridScale, VY - gridScale);
        this.context.lineTo(VX + (gridScale * this.gridSize.x) + gridScale, VY + (gridScale * this.gridSize.y) + gridScale);
        this.context.lineTo(VX - gridScale, VY + (gridScale * this.gridSize.y) + gridScale);
        this.context.closePath();
        this.context.stroke();

        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        chip.inputs.forEach((input, i) => {
            if (input && input.length) {
                const x = VX + ((i * ChipType.ChipScaleFactor) * gridScale) - (gridScale * 0.25);
                const y = VY - (gridScale * 1.6);
                this.context.fillStyle = this.colours.chip.pin;
                this.context.fillRect(x, y, gridScale * 0.5, gridScale);
                this.context.fillStyle = this.colours.chip.pinText;
                this.context.fillText(input, x + gridScale * 0.25, y - this.fontSize * 0.6);
            }
        });
        chip.outputs.forEach((output, i) => {
            if (output && output.length) {
                const x = VX + ((i * ChipType.ChipScaleFactor) * gridScale) - (gridScale * 0.25);
                const y = VY + (gridScale * this.gridSize.y) + (gridScale * 0.6);
                this.context.fillStyle = this.colours.chip.pin;
                this.context.fillRect(x, y, gridScale * 0.5, gridScale);
                this.context.fillStyle = this.colours.chip.pinText;
                this.context.fillText(output, x + gridScale * 0.25, y + gridScale + this.fontSize * 0.6);
            }
        });
    }

    private drawChip(chip: Chip, gridScale: number, chipTL: vec2) {

        //const chipTl: Vec2 = chip.gridPos(gridSize);
        const chipSize: vec2 = chip.gridSize(gridScale);

        this.context.save();

        this.context.translate(chipTL.x, chipTL.y);

        const offset: vec2 = { x: 0, y: 0 };

        switch (chip.rotation) {
            case 1:
                offset.y -= chipSize.y;
                this.context.rotate(Math.PI * 0.5 * chip.rotation);
                break;
            case 2:
                offset.x -= chipSize.x;
                offset.y -= chipSize.y;
                this.context.rotate(Math.PI * 0.5 * chip.rotation);
                break;
            case 3:
                offset.x -= chipSize.x;
                this.context.rotate(Math.PI * 0.5 * chip.rotation);
                break;
            case 0:
            default:
                break;
        }


        const edge = Math.floor(gridScale * this.chipEdge);
        const rim = Math.floor(gridScale * (this.chipEdge * this.chipEdge));

        const tl: vec2 = { x: offset.x - edge, y: offset.y - edge };
        const size: vec2 = { x: chipSize.x + (edge * 2), y: chipSize.y + (edge * 2) };


        this.context.fillStyle = this.colours.chip.pin;
        for (let i = 0; i < chip.inputs.length; i++) {
            if (typeof chip.inputs[i] !== "string" || chip.inputs[i].length < 1) continue;
            this.context.fillRect(offset.x + (i * gridScale) - rim, offset.y - Math.floor(gridScale * 0.5), rim * 2, Math.floor(gridScale * 0.5));
        }
        for (let i = 0; i < chip.outputs.length; i++) {
            if (typeof chip.outputs[i] !== "string" || chip.outputs[i].length < 1) continue;
            this.context.fillRect(offset.x + (i * gridScale) - rim, offset.y + chipSize.y, rim * 2, Math.floor(gridScale * 0.5));
        }

        this.context.fillStyle = chip.id == this.designer.selectedChipID ? this.colours.highlight : this.colours.chip.fore;
        this.context.beginPath();
        this.context.moveTo(tl.x, tl.y);
        this.context.lineTo(tl.x + size.x, tl.y);
        this.context.lineTo(tl.x + size.x, tl.y + size.y);
        this.context.closePath();
        this.context.fill();

        this.context.fillStyle = chip.id == this.designer.selectedChipID ? "#F00" : this.colours.chip.back;
        this.context.beginPath();
        this.context.moveTo(tl.x, tl.y);
        this.context.lineTo(tl.x + size.x, tl.y + size.y);
        this.context.lineTo(tl.x, tl.y + size.y);
        this.context.closePath();
        this.context.fill();

        this.context.fillStyle = this.colours.chip.base;
        this.context.fillRect(tl.x + (rim * 2), tl.y + (rim * 2), size.x - (rim * 4), size.y - (rim * 4));

        this.context.beginPath();
        this.context.arc(offset.x + chipSize.x - rim, offset.y + chipSize.y - rim, edge * 0.5, 0, 2 * Math.PI, false);
        this.context.fillStyle = "#777";
        this.context.fill();

        this.context.fillStyle = this.colours.chip.text;
        this.context.textBaseline = "middle";
        this.context.textAlign = "center";
        this.context.fillText(chip.name, tl.x + (size.x * 0.5), tl.y + (size.y * 0.5));
        if (this.designer.debug) {
            this.context.textBaseline = "top";
            this.context.textAlign = "left";
            this.context.fillText(Object.values(chip.pos).toString() + " " + chip.type, offset.x, offset.y);
        }
        this.context.restore();
    }

    private drawFPSGraph(delta: number, pos: vec2, size: vec2) {
        if (this.designer.time.last < 1) return;
        this.frameTimes.push(delta);
        const max: number = this.frameTimes.reduce((m, c) => { return c > m ? c : m; }, 0);


        let frameTimes: number[] = [];

        this.context.fillStyle = "#0F0";


        this.context.beginPath();
        this.context.moveTo(pos.x + 20, pos.y + size.y - 20);
        this.context.lineTo(pos.x + size.x, pos.y + size.y - 20);

        let total = 0;

        const rAnchor = pos.x + size.x;
        const bAnchor = pos.y + size.y - 20;
        while (total < (size.x - 20)) {
            const val = this.frameTimes.pop();
            if (val) {
                frameTimes.push(val);
                this.context.lineTo(Math.round(rAnchor - total), bAnchor - Math.round((val / max) * (size.y - 20)));
                total += val * 0.1;
            } else {
                total = size.x;
            }
        }
        this.context.closePath();
        this.context.fill();

        this.context.strokeStyle = "#000";
        this.context.beginPath();
        this.context.moveTo(pos.x + 20, pos.y);
        this.context.lineTo(pos.x + 20, pos.y + size.y - 20);
        this.context.lineTo(pos.x + size.x, pos.y + size.y - 20);
        this.context.stroke();

        frameTimes.reverse();
        this.frameTimes = frameTimes;
        this.context.fillStyle = "#F00";
        this.context.textBaseline = "top";
        this.context.textAlign = "left";
        this.context.fillText(delta.toFixed(2).toString(), pos.x, pos.y + size.y - 20);
        this.context.fillText(max.toFixed(2).toString(), pos.x, pos.y);

    }
}

interface StyleSet {
    colours: ColourSet;
    chipEdge: number;
    font: {
        size: number,
        text: string,
    };
    grid: {
        size: 40,
    };
};

interface ColourSet {
    background: string;
    grid: {
        border: string,
        lines: string,
    };
    wire: string[];
    chip: {
        base: string,
        fore: string,
        back: string,
        pin: string,
        text: string,
        pinText: string,
    };
    highlight: string;
}

export default Renderer;