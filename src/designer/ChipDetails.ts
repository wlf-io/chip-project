import Chip from "./chip/Chip";
import ChipType from "./chip/ChipType";
import detailsTemplate from "./views/chipDetails.twig";
import { twig, Template } from "twig";
import Designer from "./Designer";


class ChipDetails {
    public container!: HTMLElement;

    private chip: Chip | null = null;

    private template: Template;

    private designer: Designer;

    /*
    <div id="chipDetailsContainer" class="card">
        <div id="chipDetailsTitle" class="card-header">
            <h4>Chip</h4>
        </div>
        <div id="chipDetailsContent" class="card-body"></div>
    </div>
    */
    public static Factory(designer: Designer) {
        return new ChipDetails(designer);
    }

    constructor(designer: Designer) {
        this.designer = designer;
        this.template = twig({ data: detailsTemplate });
        this.setupHtml();
        this.hide();
    }

    public get style(): CSSStyleDeclaration { return this.container.style; }

    private setupHtml() {
        this.container = document.createElement("div");
        this.container.classList.add("card", "chipDetailsContainer", "shadow-sm");
        this.container.addEventListener("change", e => this.contentChanged(e));
        this.container.addEventListener("mouseup", e => this.mouseUp(e))
        document.body.appendChild(this.container);
    }

    private contentChanged(event: Event) {
        if (this.chip == null) return;
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
            const elem = event.target;
            const data = elem.dataset;
            switch (data.type) {
                case "name":
                    this.chip.name = elem.value;
                    break;
                case "constant":
                    let v: any = null;
                    try {
                        v = JSON.parse(elem.value);
                    } catch (e) {
                        v = elem.value;
                    }
                    this.chip.setConstant(data.index ?? "", v);
                    break;
                case "input":
                    this.chip.setInput(parseInt(data.index ?? ""), elem.value);
                    break;
                case "output":
                    this.chip.setOutput(parseInt(data.index ?? ""), elem.value);
                    break;
                case "type":
                    this.chip.type = elem.value;
                    break;
                case "size":
                    const size = this.chip.size;
                    if (data.index == "x") size.x = parseInt(elem.value);
                    if (data.index == "y") size.y = parseInt(elem.value);
                    this.chip.setSize(size);
                    break;
                default:
                    break;
            }
        }
        this.designer.chipChange();
        window.setTimeout(() => this.render(), 10);
    }

    public hide(): ChipDetails {
        if (this.container) {
            this.container.style.display = "none";
        }
        return this;
    }

    show(): ChipDetails {
        if (this.container) {
            this.container.style.display = "";
            this.container.classList.remove("closed");
        }
        return this;
    }

    setChip(chip: Chip): ChipDetails {
        this.chip = chip;
        this.render();
        return this;
    }

    public render() {
        if (this.chip == null) return;
        const active = document.activeElement;
        let activeID = "";
        if (active instanceof HTMLInputElement || active instanceof HTMLSelectElement) {
            activeID = active.id;
        }
        this.container.innerHTML = this.template.render({ chip: this.chip, types: { standard: ChipType.StandardTypeList(), custom: ChipType.CustomTypeList() }, base: ChipType.BaseChip == this.chip.type });
        if (activeID.length) {
            const elem = document.getElementById(activeID);
            if (elem) elem.focus();
        }
    }

    private mouseUp(event: MouseEvent) {
        if (event.target instanceof HTMLSpanElement) {
            if (event.target.dataset.toggle == "details") {
                this.container.classList.toggle("closed");
            }
        }
        if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLSpanElement) {
            const action = (event.target.dataset.action ?? "").toLowerCase();
            console.log(action);
            switch (action) {
                case "new const":
                    this.chip?.addConst(window.prompt("New constant name") ?? "");
                    break;
                case "remove const":
                    this.chip?.removeConst(event.target.dataset.index ?? "");
                    break;
                case "editchip":
                    if (this.chip) this.designer.editChip(this.chip.type);
                    break;
                default:
                    return;
            }
            this.render();
        }
    }
}

export default ChipDetails;