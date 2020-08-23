import { Chip, ChipContent, ChipType, Connection, ChipPin } from "./Chip";
import { Vec2, Vector2 } from "../common/Transform";
import ChipDetails from "./ChipDetails";
import RightClickMenu from "./RightClickMenu";
import RightClickData from "./data/RightClick.json";
import StandardChips from "../common/StandardChips.json";
// import Twig from "twig";

class Designer {

    private canvas!: HTMLCanvasElement;
    private baseChipDetails: ChipDetails;
    private selectedChipDetails: ChipDetails;
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
    private connectingPin: ChipPin | null = null;
    private draggingPin: boolean = false;

    private mousePos: Vec2 = { x: 0, y: 0 };
    private mouseGridPos: Vec2 = { x: 0, y: 0 };

    private debug: boolean = false;

    private rightClick!: RightClickMenu;

    private baseChip: Chip;
    private backgroundColour: string = "#FFF";

    private fontSize: number = 12;

    public static get SaveString(): string { return "CHIP_DESIGNER"; }

    public static Factory(chipType: string): Designer {
        return new Designer(chipType);
    }

    constructor(chipType: string) {
        this.load();
        ChipType.BaseChip = chipType;
        ChipType.Load();
        // this.setupTwigExtensions();
        this.baseChip = new Chip(chipType, chipType);
        this.selectedChipDetails = new ChipDetails();
        this.selectedChipDetails.style.top = "20px";
        this.selectedChipDetails.style.right = "20px";
        this.baseChipDetails = new ChipDetails();
        this.baseChipDetails.style.bottom = "20px";
        this.baseChipDetails.style.right = "20px";
        this.baseChipDetails.setChip(this.baseChip).show();
        this.setupContextMenu();
        window.addEventListener("beforeunload", () => this.save());

        this.content.updateConnectionsForChip(this.baseChip);

        const chip = this.content.chips[0];
        if (chip) {
            const pinA = this.baseChip.getInputPin(this.baseChip.inputs[0]);
            const pinB = chip.getInputPin(chip.inputs[0]);
            if (pinA && pinB) {
                console.log("CONNECT BASE", pinA, pinB);
                this.content.connect(pinA, pinB);
            }
        }
        console.log(ChipType.toJSON());
    }

    private get content(): ChipContent {
        return this.baseChip.content;
    }

    private save() {
        window.localStorage.setItem(Designer.SaveString, JSON.stringify({
            zoom: this.zoom,
            topLeft: { ...this.topLeft },
            debug: this.debug,
        }));
    }

    private load() {
        const json = window.localStorage.getItem(Designer.SaveString);
        if (json) {
            const data = JSON.parse(json);

            this.zoom = parseInt(data.zoom ?? this.zoom);
            this.topLeft = { ...(data.topLeft ?? this.topLeft) };
            this.debug = data.debug ?? this.debug;
        }
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

    private get gridSize(): Vec2 { return this.baseChip.content.size; }

    public setChipSize(gridSize: Vec2): Designer {
        this.baseChip.setSize(gridSize);
        this.content.chips.forEach(chip => chip.clamp2Grid(this.gridSize));
        this.baseChipDetails.setChip(this.baseChip);
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
        this.canvas.addEventListener('mouseleave', e => this.mouseLeave(e));
        this.canvas.addEventListener('wheel', e => this.mouseWheel(e));
        this.canvas.addEventListener("contextmenu", e => this.mouseRightClick(e));
        window.addEventListener("keyup", e => this.keyUp(e));
        return this;
    }

    private konami: string[] = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a", "Enter"];
    private konamiProgress: number = 0;

    private keyUp(event: KeyboardEvent) {
        if (event.altKey && event.shiftKey && event.ctrlKey && event.key === "D") {
            this.debug = !this.debug;
        }
        if (event.target instanceof HTMLElement && event.target.tagName.toUpperCase() == "BODY") {
            if (event.key == this.konami[this.konamiProgress]) {
                this.konamiProgress++;
                if (this.konamiProgress >= this.konami.length) {
                    this.konamiProgress = 0;
                    this.doKonami();
                    console.log("KONAMI");
                }
            } else this.konamiProgress = 0;
        } else this.konamiProgress = 0;
    }

    private doKonami() {
        let h = 0;
        // let rgb: { r: number, g: number, b: number };
        const int = window.setInterval(
            () => {
                h++;
                if (h > 360) {
                    this.backgroundColour = "#FFF";
                    window.clearInterval(int);
                } else {
                    const rgb = this.HSVtoRGB(h / 360, 1, 1);
                    this.backgroundColour = `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g.toString(16).padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`;
                }
            }, 10
        );
    }
    HSVtoRGB(h: number, s: number, v: number) {
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

    private clamp(val: number, min: number, max: number) {
        return Math.min(Math.max(val, min), max);
    }

    private pos2GridScale(pos: Vec2) {
        return { x: pos.x / this.gridScale, y: pos.y / this.gridScale };
    }

    private snapPos2Grid(pos: Vec2): Vec2 {
        pos = this.pos2GridScale(pos);
        return {
            x: this.clamp(Math.round(pos.x), 0, this.gridSize.x - 1),
            y: this.clamp(Math.round(pos.y), 0, this.gridSize.y - 1)
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
    private getPinAtPos(pos: Vec2): ChipPin | null {
        const chip = this.getChipAtPos(pos, 0.25);
        if (chip) {
            pos = this.pos2GridScale(pos);
            return chip.getPinAtPos(pos);
        }
        return null;
    }

    private getChipAtPos(pos: Vec2, pad: number | null = null): Chip | null {
        pad ??= this.chipEdge * 0.5;
        const gPos = this.pos2GridScale(pos);
        const chips = this.content.chips;
        for (const chip of chips) {
            if (chip.intersects({ top: gPos.y, left: gPos.x, bottom: gPos.y, right: gPos.x }, pad)) {
                return chip;
            }

            // const [tl, br] = chip.chipBounds(this.gridScale, 0.3);
            // if (pos.x >= tl.x && pos.y >= tl.y) {
            //     if (pos.x <= br.x && pos.y <= br.y) {
            //         return chip;
            //     }
            // }
        }
        return null;
    }

    private mouseDown(event: MouseEvent) {
        this.updateMousePos(event);
        this.rightClick.hide();
        this.draggingPin = false;
        this.draggingChip = false;
        this.draggingWindow = false;
        this.selectedChip = "";
        this.selectedChipDetails.hide();
        if (event.button == 0) {
            const chip: Chip | null = this.getChipAtPos(this.mouseGridPos);
            if (chip != null) {
                const chipPos = chip.gridPos(this.gridScale);
                const chipSize = chip.gridSize(this.gridScale);
                chipPos.x += chipSize.x * 0.5;
                chipPos.y += chipSize.y * 0.5;
                this.draggingChipOffset.x = chipPos.x - this.mouseGridPos.x;
                this.draggingChipOffset.y = chipPos.y - this.mouseGridPos.y;
                this.selectedChip = chip.id;
                this.draggingChip = true;
                this.selectedChipDetails.setChip(chip);
            } else {
                const pin = this.getPinAtPos(this.mouseGridPos);
                if (pin) {
                    this.connectingPin = pin;
                    this.draggingPin = true;
                }
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
            this.topLeft = { ...this.draggingWindowOffset };
            this.topLeft.x -= this.mousePos.x;
            this.topLeft.y -= this.mousePos.y;
            this.topLeft.x = this.clamp(this.topLeft.x, 200 - this.canvas.width, 200);
            this.topLeft.y = this.clamp(this.topLeft.y, 200 - this.canvas.height, 200);
        }
    }
    private mouseUp(event: MouseEvent) {
        this.updateMousePos(event);
        if (event.button == 0) {
            if (this.draggingChip) {
                const sChip = this.content.getChip(this.selectedChip);
                if (sChip != null) {
                    const orgPos = { ...sChip.pos };
                    const pos: Vec2 = { ...this.mouseGridPos };
                    pos.x += this.draggingChipOffset.x;
                    pos.y += this.draggingChipOffset.y;
                    const size = sChip.gridSize(this.gridScale);
                    pos.x -= size.x * 0.5;
                    pos.y -= size.y * 0.5;
                    const gridPos = this.snapPos2Grid(pos);
                    sChip.setPos(gridPos, this.gridSize);
                    for (const oChip of this.content.chips) {
                        if (oChip.id == sChip.id) continue;
                        if (oChip.intersectsChip(sChip)) {
                            sChip.setPos(orgPos, this.gridSize);
                            break;
                        }
                    }
                    this.content.updateConnectionsForChip(sChip);
                }
            } else if (this.draggingPin) {
                const pin = this.getPinAtPos(this.mouseGridPos);
                if (this.connectingPin && pin) {
                    if (pin.isEqualTo(this.connectingPin)) {
                        this.content.disconnect(pin);
                    } else this.content.connect(this.connectingPin, pin);
                }
            }
        }
        this.draggingChip = false;
        this.draggingWindow = false;
        this.draggingPin = false;
        this.connectingPin = null;
        if (this.selectedChip != "") {
            this.selectedChipDetails.show();
        }
    }
    private mouseLeave(event: MouseEvent) {
        this.updateMousePos(event);
        this.draggingChip = false;
        this.draggingWindow = false;
        this.draggingPin = false;
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
                const type = ChipType.New(window.prompt("New chip type name:") ?? "");
                this.setupContextMenu();
                if (type) this.insertChipAtRightClick(type);
                break;
            default:
                console.error("Unhandler Right Click", action);
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
        this.selectedChipDetails.hide();
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


        this.context.fillStyle = this.backgroundColour;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.fillStyle = "#00F";
        this.context.textBaseline = "top";
        this.context.textAlign = "left";
        this.fontSize = Math.round(12 * this.zoom);
        this.context.font = `normal bold ${this.fontSize}px sans-serif`;
        this.context.fillText(this.zoom.toString(), 0, 0);

        const gridScale = this.gridScale;
        const VX = -this.topLeft.x;
        const VY = -this.topLeft.y;

        this.drawGrid(VX, VY, gridScale);
        this.drawChips(VX, VY, gridScale);
        this.drawConnections(VX, VY, gridScale);

        if (this.debug) {
            this.drawFPSGraph(delta, { x: 0, y: this.canvas.height - 120 }, { x: 520, y: 120 });
            this.context.fillText([Object.values(this.mouseGridPos), Object.values(this.snapPos2Grid(this.mouseGridPos))].toString(), 0, 0);
        }

    }

    private drawConnections(VX: number, VY: number, gridScale: number) {
        this.content.connections.forEach(con => {
            this.drawConnection(con, VX, VY, gridScale);
        });
        if (this.draggingPin && this.connectingPin) {

            let pinPos = this.content.getChip(this.connectingPin.chip)?.getPinPos(this.connectingPin);
            if (pinPos) {
                pinPos = this.pinPos2RenderPos(pinPos, this.connectingPin.output, gridScale);
                this.context.strokeStyle = "#F00";
                this.context.beginPath();
                this.context.moveTo(VX + pinPos.x, VY + pinPos.y);
                this.context.lineTo(this.mousePos.x, this.mousePos.y);
                this.context.stroke();
            }
        }
    }

    private pinPos2RenderPos(pos: Vec2, output: boolean, gridScale: number) {
        pos = Vector2.Multiply(pos, gridScale);
        pos.y += (gridScale * (output ? 0.4 : -0.4));
        return pos;
    }

    private drawConnection(con: Connection, VX: number, VY: number, gridScale: number) {
        const sChip = this.content.getChip(con.source.chip);
        const tChip = this.content.getChip(con.target.chip);
        if (sChip == null || tChip == null) return;
        const src: Vec2 = this.pinPos2RenderPos(sChip.getPinPos(con.source), con.source.output, gridScale);
        const trg: Vec2 = this.pinPos2RenderPos(tChip.getPinPos(con.target), con.target.output, gridScale);

        this.context.beginPath();
        this.context.moveTo(VX + src.x, VY + src.y);
        con.path.forEach(point => this.context.lineTo(VX + (point.x * gridScale), VY + (point.y * gridScale)));
        this.context.lineTo(VX + trg.x, VY + trg.y);
        //this.context.fillStyle = con.path.length > 2 ? "#333" : "#F00";
        this.context.strokeStyle = con.validPath ? "#333" : "#F00";
        this.context.stroke();
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
        for (let x = 0; x <= this.gridSize.x; x++) {
            this.context.beginPath();
            this.context.moveTo(VX + (gridScale * x), VY - gridScale);
            this.context.lineTo(VX + (gridScale * x), VY + (gridScale * this.gridSize.y) + gridScale);
            this.context.stroke();
        }
        for (let y = 0; y <= this.gridSize.y; y++) {
            this.context.beginPath();
            this.context.moveTo(VX - gridScale, VY + (gridScale * y));
            this.context.lineTo(VX + (gridScale * this.gridSize.x) + gridScale, VY + (gridScale * y));
            this.context.stroke();
        }

        this.context.moveTo(0, 0);

        this.context.setLineDash([]);
        this.context.fillStyle = "#333";
        this.context.strokeStyle = "#333";
        this.context.beginPath();
        this.context.moveTo(VX - gridScale, VY - gridScale);
        this.context.lineTo(VX + (gridScale * this.gridSize.x) + gridScale, VY - gridScale);
        this.context.lineTo(VX + (gridScale * this.gridSize.x) + gridScale, VY + (gridScale * this.gridSize.y) + gridScale);
        this.context.lineTo(VX - gridScale, VY + (gridScale * this.gridSize.y) + gridScale);
        this.context.closePath();
        this.context.stroke();

        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.baseChip.inputs.forEach((input, i) => {
            if (input && input.length) {
                const x = VX + ((i * ChipType.ChipScaleFactor) * gridScale) - (gridScale * 0.25);
                const y = VY - (gridScale * 1.6);
                this.context.fillStyle = "#888";
                this.context.fillRect(x, y, gridScale * 0.5, gridScale);
                this.context.fillStyle = "#333";
                this.context.fillText(input, x + gridScale * 0.25, y - this.fontSize * 0.6);
            }
        });
        this.baseChip.outputs.forEach((output, i) => {
            if (output && output.length) {
                const x = VX + ((i * ChipType.ChipScaleFactor) * gridScale) - (gridScale * 0.25);
                const y = VY + (gridScale * this.gridSize.y) + (gridScale * 0.6);
                this.context.fillStyle = "#888";
                this.context.fillRect(x, y, gridScale * 0.5, gridScale);
                this.context.fillStyle = "#333";
                this.context.fillText(output, x + gridScale * 0.25, y + gridScale + this.fontSize * 0.6);
            }
        });
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