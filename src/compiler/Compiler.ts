import { ChipSource, IsChipSource } from "../common/interfaces/source.interfaces";

class Compiler {
    private source: ChipSource | null = null;

    constructor() {

    }

    public loadSource(source: ChipSource | string) {
        this.source = null;
        const json = typeof source == "string" ? JSON.parse(source) : source;
        console.groupCollapsed("SOURCE TEST");
        if (IsChipSource(json)) {
            this.source = json;
        }
        console.groupEnd();
        if (this.source == null) throw "NOT VALID CHIP SOURCE";
    }

    run() {
        console.log(this.source);
    }


}

export default Compiler;