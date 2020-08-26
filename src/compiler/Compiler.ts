import { ChipSource, ChipTypeData, ChipTypeDataSet, IsChipSource } from "../common/interfaces/source.interfaces";
import CompileChip from "./CompileChip";
import StandardChips from "../common/StandardChips.json";
import BaseChipTemplate from "./views/baseChip.twig";
import { twig, Template } from "twig";

interface ICompilerConstructor {
    debug?: boolean;
}

class Compiler {
    private source!: ChipSource;

    private standardChips: ChipTypeDataSet = {};

    private template: Template;

    public static RES: any = null;

    private debug: boolean = false;

    constructor(params?: ICompilerConstructor) {
        this.template = twig({ data: BaseChipTemplate });
        if (params) {
            this.debug = params.debug == true;
        }
    }

    public loadSource(source: ChipSource | string) {
        const json = typeof source == "string" ? JSON.parse(source) : source;
        console.groupCollapsed("SOURCE TEST");
        if (IsChipSource(json)) {
            this.source = json;
        }
        console.groupEnd();
        if (typeof this.source == "undefined") throw "NOT VALID CHIP SOURCE";
        this.loadStandard();
    }

    loadStandard() {
        for (const [name, raw] of Object.entries(StandardChips)) {
            const data: ChipTypeData = {
                inputs: [...(raw.inputs ?? [])],
                outputs: [...(raw.outputs ?? [])],
                //@ts-ignore
                constants: [...(raw.constants ?? [])],
                content: {
                    chips: [],
                    connections: [],
                },
                code: raw.code ?? null,
            };
            this.standardChips[name] = data;
        }
    }

    run() {
        const _chipCode: { [k: string]: string } = {};
        const _neededChips: string[] = [];
        Object.keys(this.source.chipData).forEach(type => {
            const comp = new CompileChip(type, { ...this.source.chipData, ...this.standardChips }, this.debug);
            const result = comp.compile();
            _chipCode[type] = result.code;
            _neededChips.push(...result.customChipsNeeded);
        }, {});

        const neededChips = [...(new Set([..._neededChips, this.source.chip.type]))];

        const chipConsts = Object.keys(this.source.chip.constants).sort().map(c => this.source.chip.constants[c]);

        const chipCode: { [k: string]: string } = {};

        neededChips.forEach(type => {
            chipCode[type] = _chipCode[type];
        })

        console.groupCollapsed("Compile Result");
        const code = this.template.render({
            chipName: this.source.chip.type + "Chip",
            chipCode: chipCode,
            chipConsts: chipConsts,
        });
        console.groupCollapsed("SOURCE");
        console.log(code);
        console.groupEnd();
        Compiler.RES = eval(code);
        console.groupEnd();
    }
}



export default Compiler;