import { ChipData, ChipTypeDataSet } from "../common/interfaces/source.interfaces";
import { twig, Template } from "twig";
import chipTemplate from "./views/chip.twig";

export default class CompileChip {
    private inputVars: string[] = [];
    private outputVars: string[] = [];
    private constantVars: string[] = [];

    private chip: ChipData;
    private innerChips: ChipData[] = [];

    private chipData: ChipTypeDataSet;

    private template: Template;

    constructor(chip: ChipData, all: ChipTypeDataSet) {
        if (!all.hasOwnProperty(chip.type)) throw `CHIP DATA MISSING TYPE [${chip.type}]`;

        this.innerChips = all[chip.type].content.chips;

        const types: string[] = [...(new Set([chip.type, ...this.innerChips.map(chip => chip.type)]))];

        this.chipData = types.reduce((p, c) => {
            return { ...p, [c]: all[c] };
        }, {});

        this.chip = chip;
        const innerData = {}

        this.extractVars();
        this.template = twig({ data: chipTemplate });
    }

    private extractVars() {
        [this.chip, ...this.innerChips].forEach(chip => {
            const data = this.chipData[chip.type];
            const id = chip.id.replace(/[\W_]+/g, "_");
            for (const i in data.inputs) {
                this.inputVars.push(`I_${id}_${i}`);
            }
            for (const o in data.outputs) {
                this.inputVars.push(`O_${id}_${o}`);
            }
            for (const c in data.constants) {
                this.inputVars.push(`I_${id}_${c}`);
            }
        });
    }

    public render(): string {
        return this.template.render({
            inputs: this.inputVars,
            outputs: this.outputVars,
            constants: this.constantVars,
        });
    }
}