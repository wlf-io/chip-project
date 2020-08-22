import { Chip, ChipType } from "./Chip";
import detailsTemplate from "./views/chipDetails.twig";
import { twig, Template } from "twig";


class ChipDetails {
    public container!: HTMLElement;

    private chip: Chip | null = null;

    private template: Template;

    /*
    <div id="chipDetailsContainer" class="card">
        <div id="chipDetailsTitle" class="card-header">
            <h4>Chip</h4>
        </div>
        <div id="chipDetailsContent" class="card-body"></div>
    </div>
    */
    public static Factory() {
        return new ChipDetails();
    }

    constructor() {
        this.template = twig({ data: detailsTemplate });
        this.setupHtml();
    }

    public get style(): CSSStyleDeclaration { return this.container.style; }

    private setupHtml() {
        this.container = document.createElement("div");
        this.container.classList.add("card", "chipDetailsContainer");
        this.container.addEventListener("change", e => this.contentChanged(e));
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
                    this.chip.setConstant(data.index ?? "", elem.value);
                    break;
                case "input":
                    this.chip.setInput(parseInt(data.index ?? ""), elem.value);
                    break;
                case "output":
                    this.chip.setOutput(parseInt(data.index ?? ""), elem.value);
                    break;
                case "type":
                    this.chip.type = elem.value;
                    this.setChip(this.chip);
                    break;
                case "size":
                    const size = this.chip.size;
                    if (data.index == "x") size.x = parseInt(elem.value);
                    if (data.index == "y") size.y = parseInt(elem.value);
                    this.chip.setSize(size);
                    this.setChip(this.chip);
                    break;
                default:
                    break;
            }
        }
        console.log(JSON.parse(JSON.stringify(this.chip)));
    }

    public hide() {
        if (this.container) {
            this.container.style.display = "none";
        }
    }

    show() {
        if (this.container) {
            this.container.style.display = "";
        }
    }

    setChip(chip: Chip) {
        this.chip = chip;
        this.container.innerHTML = this.template.render({ chip, types: { standard: ChipType.StandardTypeList(), custom: ChipType.CustomTypeList() } });
    }
}

export default ChipDetails;