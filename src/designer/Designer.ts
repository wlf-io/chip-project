import { Chip, ChipContent, ChipType, ChipPin } from "./Chip";
import { Vec2 } from "../common/Transform";
import ChipDetails from "./ChipDetails";
import RightClickMenu from "./RightClickMenu";
import RightClickData from "./data/RightClick.json";
import StandardChips from "../common/StandardChips.json";
import Renderer from "./Renderer";
// import Twig from "twig";

declare global {
    interface Window { ChipDesigner: Designer; }
}

class Designer {

    // private canvas!: HTMLCanvasElement;
    private baseChipDetails: ChipDetails;
    private selectedChipDetails: ChipDetails;
    // private context!: CanvasRenderingContext2D;

    private zoom: number = 1;

    private _topLeft: Vec2 = { x: -25, y: -25 };

    private running: boolean = false;

    private _time: { last: number, delta: number, total: number } = {
        last: 0,
        delta: 0,
        total: 0,
    };
    //private lastTime: number = 0;

    private _selectedChip: string = "";
    private draggingChip: boolean = false;
    private draggingChipOffset: Vec2 = { x: 0, y: 0 };

    private draggingWindow: boolean = false;
    private draggingWindowOffset: Vec2 = { x: 0, y: 0 };

    private _connectingPin: ChipPin | null = null;
    private _draggingPin: boolean = false;

    private _mousePos: Vec2 = { x: 0, y: 0 };
    private _mouseGridPos: Vec2 = { x: 0, y: 0 };
    private rightClickPos: Vec2 = { x: 0, y: 0 };

    private _debug: boolean = false;

    private rightClick!: RightClickMenu;

    private baseChip: Chip;

    private renderer!: Renderer;

    public static get SaveString(): string { return "CHIP_DESIGNER"; }

    public static Factory(chipType: string): Designer {
        return new Designer(chipType);
    }

    constructor(chipType: string) {
        if (window.ChipDesigner) {
            throw "CHIP DESIGNER ALREADY RUN";
        }
        window.ChipDesigner = this;
        this.load();
        ChipType.BaseChip = chipType;
        ChipType.Load();
        // this.setupTwigExtensions();
        this.baseChip = new Chip(chipType, chipType);
        this.baseChip.content.setParentChip(this.baseChip);
        this.selectedChipDetails = new ChipDetails();
        this.selectedChipDetails.style.top = "20px";
        this.selectedChipDetails.style.right = "20px";
        this.baseChipDetails = new ChipDetails();
        this.baseChipDetails.style.bottom = "20px";
        this.baseChipDetails.style.right = "20px";
        this.baseChipDetails.setChip(this.baseChip).show();
        this.setupContextMenu();
        this.setupRenderer();
        window.addEventListener("beforeunload", () => this.save());

        this.content.updateConnectionsForChip(this.baseChip);

        console.log(ChipType.toJSON());
    }


    public get selectedChip(): string { return this._selectedChip; }

    //public get mouseGridPos(): Vec2 { return this._mouseGridPos; }

    //public get mousePos(): Vec2 { return this._mousePos; }

    public get time() { return { ...this._time }; }

    public get debug(): boolean { return this._debug; }

    public get topLeft(): Vec2 { return { ...this._topLeft }; }

    public get ChipType(): ChipType { return ChipType; }

    public get connectingPin(): ChipPin | null { return this._connectingPin; }
    public get mouseState() {
        return {
            pos: this._mousePos,
            gridPos: this._mouseGridPos,
            draggingChip: this.draggingChip,
            draggingPin: this._draggingPin,
            draggingWindow: this.draggingWindow,
            draggingChipOffset: this.draggingChipOffset,
        };
    }

    public get mouse() {
        return this.mouseState;
    }

    private get content(): ChipContent {
        return this.baseChip.content;
    }

    private save() {
        window.localStorage.setItem(Designer.SaveString, JSON.stringify({
            zoom: this.zoom,
            topLeft: { ...this._topLeft },
            debug: this._debug,
        }));
    }

    private load() {
        const json = window.localStorage.getItem(Designer.SaveString);
        if (json) {
            const data = JSON.parse(json);

            this.zoom = parseInt(data.zoom ?? this.zoom);
            this._topLeft = { ...(data.topLeft ?? this._topLeft) };
            this._debug = data.debug ?? this._debug;
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

    public get gridSize(): Vec2 { return this.baseChip.content.size; }

    public setChipSize(gridSize: Vec2): Designer {
        this.baseChip.setSize(gridSize);
        this.content.chips.forEach(chip => chip.clamp2Grid(this.gridSize));
        this.baseChipDetails.setChip(this.baseChip);
        return this;
    }

    public setupRenderer(): void {

        this.renderer = new Renderer(this);

        const canvas = this.renderer.canvas;

        canvas.addEventListener('mousedown', e => this.mouseDown(e));
        canvas.addEventListener('mousemove', e => this.mouseMove(e));
        canvas.addEventListener('mouseup', e => this.mouseUp(e));
        canvas.addEventListener('mouseleave', e => this.mouseLeave(e));
        canvas.addEventListener('wheel', e => this.mouseWheel(e));
        canvas.addEventListener("contextmenu", e => this.mouseRightClick(e));
        window.addEventListener("keyup", e => this.keyUp(e));
    }

    private konami: string[] = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a", "Enter"];
    private konamiProgress: number = 0;

    private keyUp(event: KeyboardEvent) {
        if (event.altKey && event.shiftKey && event.ctrlKey && event.key === "D") {
            this._debug = !this._debug;
        }
        if (event.target instanceof HTMLElement && event.target.tagName.toUpperCase() == "BODY") {
            if (event.key == this.konami[this.konamiProgress]) {
                this.konamiProgress++;
                if (this.konamiProgress >= this.konami.length) {
                    this.konamiProgress = 0;
                    this.renderer.doKonami();
                    console.log("KONAMI");
                }
            } else this.konamiProgress = 0;
        } else this.konamiProgress = 0;
    }

    private clamp(val: number, min: number, max: number) {
        return Math.min(Math.max(val, min), max);
    }

    public pos2GridScale(pos: Vec2) {
        const scale = this.renderer.gridScale;
        return { x: pos.x / scale, y: pos.y / scale };
    }

    public snapPos2Grid(pos: Vec2): Vec2 {
        pos = this.pos2GridScale(pos);
        return {
            x: this.clamp(Math.round(pos.x), 0, this.gridSize.x - 1),
            y: this.clamp(Math.round(pos.y), 0, this.gridSize.y - 1)
        };
    }

    private updateMousePos(event: MouseEvent) {
        const rect = this.renderer.canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        this._mousePos.x = x;
        this._mousePos.y = y;
        this._mouseGridPos.x = x + this._topLeft.x;
        this._mouseGridPos.y = y + this._topLeft.y;
    }
    private getPinAtPos(pos: Vec2): ChipPin | null {
        const gPos = this.pos2GridScale(pos);
        if (gPos.y < -0.5 || gPos.y > (this.gridSize.y + 0.5)) {
            console.log("GET PIN", gPos, this.baseChip.getPinAtPos(gPos));
            return this.baseChip.getPinAtPos(gPos);
        } else {
            const chip = this.getChipAtPos(pos, 0.25);
            if (chip) {
                return chip.getPinAtPos(gPos);
            }
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
        this._draggingPin = false;
        this.draggingChip = false;
        this.draggingWindow = false;
        this._selectedChip = "";
        this.selectedChipDetails.hide();
        if (event.button == 0) {
            const chip: Chip | null = this.getChipAtPos(this._mouseGridPos);
            if (chip != null) {
                const chipPos = chip.gridPos(this.renderer.gridScale);
                const chipSize = chip.gridSize(this.renderer.gridScale);
                chipPos.x += chipSize.x * 0.5;
                chipPos.y += chipSize.y * 0.5;
                this.draggingChipOffset.x = chipPos.x - this._mouseGridPos.x;
                this.draggingChipOffset.y = chipPos.y - this._mouseGridPos.y;
                this._selectedChip = chip.id;
                this.draggingChip = true;
                this.selectedChipDetails.setChip(chip);
            } else {
                const pin = this.getPinAtPos(this._mouseGridPos);
                if (pin) {
                    this._connectingPin = pin;
                    this._draggingPin = true;
                }
            }

        } else if (event.button == 1) {
            this.draggingWindow = true;
            this.draggingWindowOffset = { ...this._mousePos };
            this.draggingWindowOffset.x += this._topLeft.x;
            this.draggingWindowOffset.y += this._topLeft.y;
        }
    }

    private mouseMove(event: MouseEvent) {
        this.updateMousePos(event);
        if (this.draggingWindow) {
            this._topLeft = { ...this.draggingWindowOffset };
            this._topLeft.x -= this._mousePos.x;
            this._topLeft.y -= this._mousePos.y;
            this._topLeft.x = this.clamp(this._topLeft.x, 200 - this.renderer.canvas.width, 200);
            this._topLeft.y = this.clamp(this._topLeft.y, 200 - this.renderer.canvas.height, 200);
        }
    }
    private mouseUp(event: MouseEvent) {
        this.updateMousePos(event);
        if (event.button == 0) {
            if (this.draggingChip) {
                const sChip = this.content.getChip(this._selectedChip);
                if (sChip != null) {
                    const orgPos = { ...sChip.pos };
                    const pos: Vec2 = { ...this._mouseGridPos };
                    pos.x += this.draggingChipOffset.x;
                    pos.y += this.draggingChipOffset.y;
                    const size = sChip.gridSize(this.renderer.gridScale);
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
            } else if (this._draggingPin) {
                const pin = this.getPinAtPos(this._mouseGridPos);
                if (this._connectingPin && pin) {
                    if (pin.isEqualTo(this._connectingPin)) {
                        this.content.disconnect(pin);
                    } else this.content.connect(this._connectingPin, pin);
                }
            }
        }
        this.draggingChip = false;
        this.draggingWindow = false;
        this._draggingPin = false;
        this._connectingPin = null;
        if (this._selectedChip != "") {
            this.selectedChipDetails.show();
        }
    }
    private mouseLeave(event: MouseEvent) {
        this.updateMousePos(event);
        this.draggingChip = false;
        this.draggingWindow = false;
        this._draggingPin = false;
    }

    private mouseRightClick(event: MouseEvent) {
        this.updateMousePos(event);
        event.preventDefault();
        this.rightClickPos = { ...this._mouseGridPos };
        const chip = this.getChipAtPos(this.rightClickPos);
        const reqs: string[] = [];
        if (chip) reqs.push("target-chip");
        this.rightClick.show(this._mousePos, reqs);
    }

    private rightClickAction(action: string[]): void {
        switch (action[0] ?? "") {
            case "add chip":
                this.insertChipAtRightClick(action[1] ?? "+");
                break;
            case "remove":
                const chip = this.getChipAtPos(this.rightClickPos);
                if (chip) this.content.removeChip(chip);
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
        const delta = time - this._time.last;
        this._time.total = time;
        this._time.delta = delta;
        this.renderer.draw(delta, this.baseChip, this.content);
        this._time.last = time;
        if (this.running) {
            window.requestAnimationFrame(time => this.update(time));
        }
    }
}


export default Designer;