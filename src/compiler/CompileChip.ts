import { ChipData, ChipTypeData, ChipTypeDataSet, ConnectionData, PinData } from "../common/interfaces/source.interfaces";
import { twig, Template } from "twig";
import chipTemplate from "./views/chip.twig";

export default class CompileChip {
    // private chipInputs: string[] = [];
    // private chipOutputs: string[] = [];
    // private chipConstants: string[] = [];


    // private inputVars: string[] = [];
    // private outputVars: string[] = [];
    // private constantVars: { [k: string]: any } = {};

    // private customChips: CustomChip[] = [];

    private type: string;
    private innerChips: ChipData[] = [];

    private chipData: ChipTypeDataSet;

    private chipOrder: string[] = [];

    private template: Template;

    private debug: boolean;

    constructor(type: string, all: ChipTypeDataSet, debug: boolean = false) {
        this.debug = debug;
        if (!all.hasOwnProperty(type)) throw `CHIP DATA MISSING TYPE [${type}]`;

        const chips = all[type].content.chips;
        const cons = all[type].content.connections;

        this.innerChips = chips.filter(chip => {
            for (const con of cons) {
                if (con.source.chip == chip.id || con.target.chip == chip.id) return true;
            }
            return false;
        });

        const types: string[] = [...(new Set([type, ...this.innerChips.map(chip => chip.type)]))];

        this.chipData = types.reduce((p, c) => {
            if (!all.hasOwnProperty(c)) throw "MISSING CHIP " + c;
            return {
                ...p, [c]: {
                    ...all[c],
                    outputs: all[c].outputs.filter(o => (o ?? "").length),
                    inputs: all[c].inputs.filter(i => (i ?? "").length),
                }
            };
        }, {});

        this.type = type;

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
    }

    private generateRunCode(): ChipCode[] {
        const chips: ChipCode[] = [];

        //chips.push(this.createBaseChipCode());

        this.chipOrder.forEach(chipID => {
            const chip = this.innerChips.find(chip => chip.id == chipID);
            if (chip) {
                chips.push(this.createChipCode(chip));
            }
        });

        return chips;
    }

    private createBaseChipCode(): ChipCode {
        return {
            rawID: this.type,
            id: this.type.replace(/[\W_]+/g, "_"),
            varName: "",
            name: this.type,
            type: this.type,
            description: "Setting Input Vars",
            outputs: [...this.chipData[this.type].outputs],
            inputs: [...this.chipData[this.type].inputs],
            inputConnections: this.getChipCons(this.type, true).map(con => this.createConnection(con)),
            code: "",
            isCustom: true,
            constants: this.chipData[this.type].constants.reduce((r, c) => { return { ...r, [c]: null }; }, {}),
        };
    }

    private createConnection(con: ConnectionData): InputConnection {
        return {
            source: this.createPin(con.source),
            target: this.createPin(con.target),
        }
    }

    private createPin(data: PinData): Pin {
        const chipIsBase = data.chip == this.type;
        return {
            chip: chipIsBase ? this.type : data.chip.replace(/[\W_]+/g, "_"),
            name: data.name,
            output: data.output,
        };
    }

    private createChipCode(chip: ChipData): ChipCode {
        const data = this.chipData[chip.type];
        const id = chip.id.replace(/[\W_]+/g, "_");
        return {
            rawID: chip.id,
            id: id,
            type: chip.type,
            varName: `CHIP_${id}`,
            name: `${chip.type}`,
            inputs: [...data.inputs],
            outputs: [...data.outputs],
            description: "Chip Code",
            code: (data.code ?? "").length > 0 ? this.getStandardChipCode(chip, data) : "",
            isCustom: (data.code ?? "").length < 1,
            inputConnections: this.getChipCons(chip.id, false).map(con => this.createConnection(con)),
            constants: { ...chip.constants },
        };
    }

    private getStandardChipCode(chip: ChipData, data: ChipTypeData): string {
        return twig({ data: data.code }).render(this.getStandardChipData(chip, data));
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
            debug: this.debug,
            chipType: this.type,
            chipName: this.type,
            chip: this.createBaseChipCode(),
            content: this.generateRunCode(),
        });
    }
}

interface ChipCode {
    rawID: string;
    id: string;
    type: string;
    code: string;
    description: string;
    isCustom: boolean;
    outputs: string[];
    inputs: string[];
    constants: { [k: string]: any };
    inputConnections: InputConnection[];
    varName: string;
    name: string;
}

interface InputConnection {
    source: Pin,
    target: Pin,
}

interface Pin {
    chip: string;
    name: string;
    output: boolean;
}

// interface CustomChip {
//     id: string;
//     varName: string;
//     chipName: string;
//     type: string;
//     constants: string[];
// }

export interface ChipCompileResult {
    code: string,
    customChipsNeeded: string[],
}