import { ChipData, ChipTypeData, ChipTypeDataSet, ConnectionData } from "../common/interfaces/source.interfaces";
import { twig, Template } from "twig";
import chipTemplate from "./views/chip.twig";

export default class CompileChip {
    private chipInputs: string[] = [];
    private chipOutputs: string[] = [];
    private chipConstants: string[] = [];


    private inputVars: string[] = [];
    private outputVars: string[] = [];
    private constantVars: { [k: string]: any } = {};

    private customChips: { [k: string]: string } = {};

    private type: string;
    private innerChips: ChipData[] = [];

    private chipData: ChipTypeDataSet;

    private chipOrder: string[] = [];

    private template: Template;

    constructor(type: string, all: ChipTypeDataSet) {
        if (!all.hasOwnProperty(type)) throw `CHIP DATA MISSING TYPE [${type}]`;

        const chips = all[type].content.chips;
        const cons = all[type].content.connections;

        console.log(cons);

        this.innerChips = chips.filter(chip => {
            for (const con of cons) {
                if (con.source.chip == chip.id || con.target.chip == chip.id) return true;
            }
            return false;
        });

        const types: string[] = [...(new Set([type, ...this.innerChips.map(chip => chip.type)]))];

        this.chipData = types.reduce((p, c) => {
            return { ...p, [c]: all[c] };
        }, {});

        this.type = type;

        this.extractVars();
        this.extractCustomChips();
        this.sortChipOrder();
        this.template = twig({ data: chipTemplate });
    }

    private sortChipOrder() {
        const chipOrderScores: { [k: string]: number } = this.innerChips.reduce((p, chip) => {
            return { ...p, [chip.id]: 0 }
        }, {});
        this.innerChips.forEach(chip => {
            const inputs = this.getChipCons(chip.id, false).filter(con => con.source.chip != this.type);
            if (inputs.length > 0) chipOrderScores[chip.id] += 10;
        });

        for (let i = 0; i < 10; i++) {
            this.innerChips.forEach(chip => {
                const inputs: ConnectionData[] = this.getChipCons(chip.id, false).filter(con => con.source.chip != this.type);
                inputs.forEach(input => {
                    chipOrderScores[chip.id] += chipOrderScores[input.source.chip];
                });
            });
        }

        this.chipOrder = Object.entries(chipOrderScores).sort((a, b) => a[1] - b[1]).map(s => s[0]);
        console.log(chipOrderScores, this.chipOrder);
    }

    private generateRunCode(): string[] {
        const lines: string[] = [];

        this.getChipCons(this.type, false).forEach(con => {
            lines.push(`I_${con.target.chip.replace(/[\W_]+/g, "_")}_${con.target.name} = I_${this.type}_${con.source.name};`);
        });

        this.chipOrder.forEach(chipID => {
            const chip = this.innerChips.find(chip => chip.id == chipID);
            if (chip) {
                lines.push(`// CHIP: ${chip.id} : ${chip.type}`);
                const id = chip.id.replace(/[\W_]+/g, "_");
                const data = this.chipData[chip.type];
                const outCons = this.getChipCons(chip.id, true);
                if ((data.code ?? "").length) {
                    const template: Template = twig({ data: data.code });
                    lines.push(template.render(this.getStandardChipData(chip, data)));
                } else {
                    const inputs = data.inputs.filter(i => (i ?? "").length).map(i => `I_${id}_${i}`);
                    const outputs = data.outputs.filter(o => (o ?? "").length).map(o => `O_${id}_${o}`);
                    lines.push(`const [${outputs.map(o => `_${o}`).join(", ")}] = CHIP_${id}.run(${inputs.join(", ")});`);
                    outputs.forEach(o => lines.push(`${o} = _${o};`));
                }
                outCons.forEach(con => {
                    if (con.target.chip == this.type) {
                        lines.push(`O_${this.type}_${con.target.name} = O_${id}_${con.source.name};`);
                    } else {
                        lines.push(`I_${con.target.chip.replace(/[\W_]+/g, "_")}_${con.target.name} = O_${id}_${con.source.name};`);
                    }
                });
                lines.push("");
            }
        });
        return lines;
    }

    private getStandardChipData(chip: ChipData, data: ChipTypeData) {
        const tData: { [k: string]: any } = {};
        const id = chip.id.replace(/[\W_]+/g, "_");
        tData["chipName"] = this.type;
        Object.entries(chip.constants).forEach(([name, value]) => {
            tData[`raw_constant_${name}`] = value;
            tData[`constant_${name}`] = `C_${id}_${name}`;
        });
        data.inputs.forEach(i => {
            tData[`input_${i}`] = `I_${id}_${i}`;
        });
        data.outputs.forEach(o => {
            tData[`output_${o}`] = `O_${id}_${o}`;
        });
        return tData;
    }

    private getChipCons(chipID: string, output: boolean): ConnectionData[] {
        return this.chipData[this.type].content.connections.filter(con => (con.source.output == output && con.source.chip == chipID) || (con.target.output == output && con.target.chip == chipID));
    }

    private extractVars() {
        for (const i of this.chipData[this.type].inputs.filter(i => (i ?? "").length)) {
            this.chipInputs.push(`I_${this.type}_${i}`);
        }
        for (const o of this.chipData[this.type].outputs.filter(i => (i ?? "").length)) {
            this.chipOutputs.push(`O_${this.type}_${o}`);
        }
        for (const c of this.chipData[this.type].constants.sort().filter(i => (i ?? "").length)) {
            this.chipConstants.push(`C_${this.type}_${c}`);
        }


        this.innerChips.forEach(chip => {
            const data = this.chipData[chip.type];
            const id = chip.id.replace(/[\W_]+/g, "_");
            for (const i of data.inputs.filter(i => (i ?? "").length)) {
                this.inputVars.push(`I_${id}_${i}`);
            }
            for (const o of data.outputs.filter(i => (i ?? "").length)) {
                this.outputVars.push(`O_${id}_${o}`);
            }
            for (const [c, v] of Object.entries(chip.constants)) {
                this.constantVars[`C_${id}_${c}`] = v;
            }
        });
    }

    private extractCustomChips() {
        this.innerChips.forEach(chip => {
            const data = this.chipData[chip.type];
            const id = chip.id.replace(/[\W_]+/g, "_");
            if (data.code == null || data.code.length < 1) {
                this.customChips[`CHIP_${id}`] = chip.type + "Chip";
            }
        });
    }

    private getCustomChipsNeeded(): string[] {
        return this.innerChips.filter(chip => (this.chipData[chip.type].code ?? "").length < 1).map(chip => chip.type);
    }

    public compile(): ChipCompileResult {
        return {
            code: this.render(),
            customChipsNeeded: this.getCustomChipsNeeded(),
        }
    }

    private render(): string {
        return this.template.render({
            chipName: this.type + "Chip",
            inputs: this.inputVars,
            outputs: this.outputVars,
            constants: this.constantVars,
            customChips: this.customChips,
            chipInputs: this.chipInputs,
            chipOutputs: this.chipOutputs,
            chipConstants: this.chipConstants,
            code: this.generateRunCode(),
        });
    }
}
export interface ChipCompileResult {
    code: string,
    customChipsNeeded: string[],
}