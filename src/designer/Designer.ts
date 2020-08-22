import { Chip, ChipContent, ChipType } from "./Chip";
import { Vec2 } from "../common/Transform";
import ChipDetails from "./ChipDetails";
import RightClickMenu from "./RightClickMenu";
import RightClickData from "./data/RightClick.json";
import StandardChips from "../common/StandardChips.json";
// import Twig from "twig";

class Designer {

    private canvas!: HTMLCanvasElement;
    public details: ChipDetails;
    private context!: CanvasRenderingContext2D;

    private zoom: number = 1;

    private topLeft: Vec2 = { x: -25, y: -25 };

    private running: boolean = false;

    private lastTime: number = 0;

    private frameTimes: number[] = [];

    private selectedChip: string = "";
    private draggingChip: boolean = false;
    private draggingChipOffset: Vec2 = { x: 0, y: 0 };
    private draggingWindow: boolean = false;
    private draggingWindowOffset: Vec2 = { x: 0, y: 0 };
    private rightClickPos: Vec2 = { x: 0, y: 0 };

    private mousePos: Vec2 = { x: 0, y: 0 };
    private mouseGridPos: Vec2 = { x: 0, y: 0 };

    private debug: boolean = true;

    private rightClick!: RightClickMenu;

    private baseChip: Chip;


    public static Factory(chipType: string): Designer {
        return new Designer(chipType);
    }

    constructor(chipType: string) {
        ChipType.BaseChip = chipType;
        // this.setupTwigExtensions();
        this.baseChip = new Chip(chipType, chipType);
        this.details = new ChipDetails();
        this.setupContextMenu();
    }

    private get content(): ChipContent {
        return this.baseChip.getData().content;
    }

    private setupContextMenu() {
        if (this.rightClick) this.rightClick.destroy();
        const chipMenus: { [k: string]: any } = Object.entries(StandardChips).reduce((p: { [k: string]: any }, [name, chip]) => {
            const type: string = chip.type || "logic";
            if (!p.hasOwnProperty(type)) p[type] = { data: {} };
            p[type]["data"][name] = ["add chip", name];
            return p;
        }, { "custom": { data: { "new ...": ["new custom chip"] } } });

        if (ChipType.CustomTypeList().length > 0) {
            chipMenus["custom"]["data"]["br1"] = null;
        }
        ChipType.CustomTypeList().forEach(type => {
            chipMenus["custom"]["data"][type] = ["add chip", type];
        });
        //@ts-ignore
        RightClickData["Add Chip"] = {
            data: chipMenus
        };
        this.rightClick = new RightClickMenu(document.body, action => this.rightClickAction(action), "root", RightClickData);
    }

    private get gridSize(): Vec2 { return { x: this.baseChip.size.x * 4, y: this.baseChip.size.y * 4 }; }

    public setChipSize(gridSize: Vec2): Designer {
        this.baseChip.setSize(gridSize);
        this.content.chips.forEach(chip => chip.clamp2Grid(this.gridSize));
        console.log(this.baseChip.size, this.gridSize);
        return this;
    }

    public setCanvas(canvas: HTMLCanvasElement): Designer {
        this.canvas = canvas;
        const context = this.canvas.getContext("2d");
        if (context == null) {
            throw "Failed to get 2d rendering context for canvas";
        }
        this.context = context;
        this.canvas.addEventListener('mousedown', e => this.mouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.mouseMove(e));
        this.canvas.addEventListener('mouseup', e => this.mouseUp(e));
        this.canvas.addEventListener('mouseleave', e => this.mouseUp(e));
        this.canvas.addEventListener('wheel', e => this.mouseWheel(e));
        this.canvas.addEventListener("contextmenu", e => this.mouseRightClick(e));
        return this;
    }

    private clamp(val: number, min: number, max: number) {
        return Math.min(Math.max(val, min), max);
    }

    private snapPos2Grid(pos: Vec2): Vec2 {
        return {
            x: this.clamp(Math.round(pos.x / this.gridScale), 0, this.gridSize.x - 1),
            y: this.clamp(Math.round(pos.y / this.gridScale), 0, this.gridSize.y - 1)
        };
    }

    private updateMousePos(event: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        this.mousePos.x = x;
        this.mousePos.y = y;
        this.mouseGridPos.x = x + this.topLeft.x;
        this.mouseGridPos.y = y + this.topLeft.y;
    }

    private getChipAtPos(pos: Vec2): Chip | null {
        const chips = this.content.chips;
        for (let i = 0; i < chips.length; i++) {
            const chip = chips[i];
            const [tl, br] = chip.chipBounds(this.gridScale, 0.3);
            if (pos.x >= tl.x && pos.y >= tl.y) {
                if (pos.x <= br.x && pos.y <= br.y) {
                    return chip;
                }
            }
        }
        return null;
    }

    private mouseDown(event: MouseEvent) {
        this.updateMousePos(event);
        this.rightClick.hide();
        this.draggingChip = false;
        this.draggingWindow = false;
        this.selectedChip = "";
        this.details.hide();
        if (event.button == 0) {
            const chip: Chip | null = this.getChipAtPos(this.mouseGridPos);
            if (chip != null) {
                console.log("CLICK", chip.id);
                const chipPos = chip.gridPos(this.gridScale);
                const chipSize = chip.gridSize(this.gridScale);
                chipPos.x += chipSize.x * 0.5;
                chipPos.y += chipSize.y * 0.5;
                this.draggingChipOffset.x = chipPos.x - this.mouseGridPos.x;
                this.draggingChipOffset.y = chipPos.y - this.mouseGridPos.y;
                this.selectedChip = chip.id;
                this.draggingChip = true;
                this.details.setChip(chip);
            }
        } else if (event.button == 1) {
            this.draggingWindow = true;
            this.draggingWindowOffset = { ...this.mousePos };
            this.draggingWindowOffset.x += this.topLeft.x;
            this.draggingWindowOffset.y += this.topLeft.y;
        }
    }

    private mouseMove(event: MouseEvent) {
        this.updateMousePos(event);
        if (this.draggingWindow) {
            console.log("DRAG");
            this.topLeft = { ...this.draggingWindowOffset };
            this.topLeft.x -= this.mousePos.x;
            this.topLeft.y -= this.mousePos.y;
            this.topLeft.x = this.clamp(this.topLeft.x, 200 - this.canvas.width, 200);
            this.topLeft.y = this.clamp(this.topLeft.y, 200 - this.canvas.height, 200);
        }
    }
    private mouseUp(event: MouseEvent) {
        this.updateMousePos(event);
        if (this.draggingChip) {
            const sChip = this.content.getChip(this.selectedChip);
            if (sChip != null) {
                const pos: Vec2 = { ...this.mouseGridPos };
                pos.x += this.draggingChipOffset.x;
                pos.y += this.draggingChipOffset.y;
                const size = sChip.gridSize(this.gridScale);
                pos.x -= size.x * 0.5;
                pos.y -= size.y * 0.5;
                const gridPos = this.snapPos2Grid(pos);
                sChip.setPos(gridPos, this.gridSize);
            }
        }
        this.draggingChip = false;
        this.draggingWindow = false;
        if (this.selectedChip != "") {
            this.details.show();
        }
    }

    private mouseRightClick(event: MouseEvent) {
        this.updateMousePos(event);
        event.preventDefault();
        this.rightClickPos = { ...this.mouseGridPos };
        const chip = this.getChipAtPos(this.rightClickPos);
        const reqs: string[] = [];
        if (chip) reqs.push("target-chip");
        this.rightClick.show(this.mousePos, reqs);
    }

    private rightClickAction(action: string[]): void {
        console.log(action);
        switch (action[0] ?? "") {
            case "add chip":
                this.insertChipAtRightClick(action[1] ?? "+");
                break;
            case "remove":
                const chip = this.getChipAtPos(this.rightClickPos);
                if (chip) {
                    this.content.removeChip(chip.id);
                }
                break;
            case "new custom chip":
                ChipType.New(window.prompt("New chip type name:") ?? "");
                this.setupContextMenu();
                break;
            default:
                break;
        }
    }

    private insertChipAtRightClick(type: string) {
        const chip: Chip = new Chip(`${type}_${Date.now()}`, type);
        chip.setPos(this.snapPos2Grid(this.rightClickPos), this.gridSize);
        this.content.addChip(chip);
    }

    private mouseWheel(e: WheelEvent) {
        this.zoom -= e.deltaY * 0.1;
        this.zoom = this.clamp(this.zoom, 0.1, 4.0);
    }

    public get gridScale(): number { return 40 * this.zoom; }
    public get chipEdge(): number { return 0.28; }

    public run(): Designer {
        this.details.hide();
        if (this.running) return this;
        this.running = true;
        this.update(0);
        return this;
    }

    public stop(): Designer {
        this.running = false;
        return this;
    }

    private update(time: number): void {
        const delta = time - this.lastTime;
        this.draw(delta);
        this.lastTime = time;
        if (this.running) {
            window.requestAnimationFrame(time => this.update(time));
        }
    }

    private draw(delta: number): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;


        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.fillStyle = "#00F";
        this.context.textBaseline = "top";
        this.context.textAlign = "left";
        this.context.font = `normal bold ${Math.round(12 * this.zoom)}px sans-serif`;
        this.context.fillText(this.zoom.toString(), 0, 0);

        const gridScale = this.gridScale;
        const VX = -this.topLeft.x;
        const VY = -this.topLeft.y;

        this.drawGrid(VX, VY, gridScale);
        this.drawChips(VX, VY, gridScale);

        if (this.debug) {
            this.drawFPSGraph(delta, { x: 0, y: this.canvas.height - 120 }, { x: 520, y: 120 });
            this.context.fillText([Object.values(this.mouseGridPos), Object.values(this.snapPos2Grid(this.mouseGridPos))].toString(), 0, 0);
            this.context.textBaseline = "bottom";
            this.context.textAlign = "right";
            this.context.fillText(JSON.stringify([this.baseChip, ChipType], null, 2), this.canvas.width, this.canvas.height);
        }

    }

    private drawChips(VX: number, VY: number, gridScale: number) {
        this.content.chips.forEach(chip => {
            if (chip.id == this.selectedChip && this.draggingChip) return;
            const chipTl = chip.gridPos(gridScale);
            chipTl.x += VX;
            chipTl.y += VY;
            this.drawChip(chip, gridScale, chipTl);
        });

        if (this.draggingChip) {
            const sChip = this.content.getChip(this.selectedChip);
            if (sChip != null) {
                const chipSize = sChip.gridSize(gridScale);
                this.drawChip(sChip, gridScale, { x: this.mouseGridPos.x + this.draggingChipOffset.x + VX - (chipSize.x * 0.5), y: this.mouseGridPos.y + this.draggingChipOffset.y + VY - (chipSize.y * 0.5) });
            }
        }
    }

    private drawGrid(VX: number, VY: number, gridScale: number) {
        this.context.fillStyle = "#DDD8";
        this.context.strokeStyle = "#DDD9";

        this.context.setLineDash([5, /**/3, 9, 3/**/, 0, 0, 5, 0]);
        for (let x = 1; x < this.gridSize.x; x++) {
            this.context.beginPath();
            this.context.moveTo(VX + (gridScale * x), VY);
            this.context.lineTo(VX + (gridScale * x), VY + (gridScale * this.gridSize.y));
            this.context.stroke();
        }
        for (let y = 1; y < this.gridSize.y; y++) {
            this.context.beginPath();
            this.context.moveTo(VX, VY + (gridScale * y));
            this.context.lineTo(VX + (gridScale * this.gridSize.x), VY + (gridScale * y));
            this.context.stroke();
        }

        this.context.moveTo(0, 0);

        this.context.setLineDash([]);
        this.context.fillStyle = "#333";
        this.context.strokeStyle = "#333";
        this.context.beginPath();
        this.context.moveTo(VX, VY);
        this.context.lineTo(VX + (gridScale * this.gridSize.x), VY);
        this.context.lineTo(VX + (gridScale * this.gridSize.x), VY + (gridScale * this.gridSize.y));
        this.context.lineTo(VX, VY + (gridScale * this.gridSize.y));
        this.context.lineTo(VX, VY);
        this.context.stroke();
    }

    private drawChip(chip: Chip, gridScale: number, chipTl: Vec2) {

        //const chipTl: Vec2 = chip.gridPos(gridSize);
        const chipSize: Vec2 = chip.gridSize(gridScale);

        const edge = Math.floor(gridScale * this.chipEdge);
        const rim = Math.floor(gridScale * (this.chipEdge * this.chipEdge));

        const tl: Vec2 = { x: chipTl.x - edge, y: chipTl.y - edge };
        const size: Vec2 = { x: chipSize.x + (edge * 2), y: chipSize.y + (edge * 2) };


        this.context.fillStyle = "#888";
        for (let i = 0; i < chip.inputs.length; i++) {
            if (typeof chip.inputs[i] !== "string" || chip.inputs[i].length < 1) continue;
            this.context.fillRect(chipTl.x + (i * gridScale) - rim, chipTl.y - Math.floor(gridScale * 0.5), rim * 2, Math.floor(gridScale * 0.5));
        }
        for (let i = 0; i < chip.outputs.length; i++) {
            if (typeof chip.outputs[i] !== "string" || chip.outputs[i].length < 1) continue;
            this.context.fillRect(chipTl.x + (i * gridScale) - rim, chipTl.y + chipSize.y, rim * 2, Math.floor(gridScale * 0.5));
        }

        this.context.fillStyle = chip.id == this.selectedChip ? "#F00" : "#444";
        this.context.beginPath();
        this.context.moveTo(tl.x, tl.y);
        this.context.lineTo(tl.x + size.x, tl.y);
        this.context.lineTo(tl.x + size.x, tl.y + size.y);
        this.context.closePath();
        this.context.fill();

        this.context.fillStyle = chip.id == this.selectedChip ? "#F00" : "#222";
        this.context.beginPath();
        this.context.moveTo(tl.x, tl.y);
        this.context.lineTo(tl.x + size.x, tl.y + size.y);
        this.context.lineTo(tl.x, tl.y + size.y);
        this.context.closePath();
        this.context.fill();

        this.context.fillStyle = "#333";
        this.context.fillRect(tl.x + (rim * 2), tl.y + (rim * 2), size.x - (rim * 4), size.y - (rim * 4));

        this.context.beginPath();
        this.context.arc(chipTl.x + chipSize.x - rim, chipTl.y + chipSize.y - rim, edge * 0.5, 0, 2 * Math.PI, false);
        this.context.fillStyle = "#777";
        this.context.fill();

        this.context.fillStyle = "#DDD";
        this.context.textBaseline = "middle";
        this.context.textAlign = "center";
        this.context.fillText(chip.name, tl.x + (size.x * 0.5), tl.y + (size.y * 0.5));
        if (this.debug) {
            this.context.textBaseline = "top";
            this.context.textAlign = "left";
            this.context.fillText(Object.values(chip.pos).toString(), chipTl.x, chipTl.y);
        }
    }

    drawFPSGraph(delta: number, pos: Vec2, size: Vec2) {
        if (this.lastTime < 1) return;
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


export default Designer;