import { PinData } from "../../common/interfaces/source.interfaces"

class Pin {
    private _chip: string;
    private _output: boolean;
    private _name: string;


    public get id(): string {
        return `${this.chip}_${this.output}_${this.name}`;
    }

    public static Factory(chip: string = "", output: boolean = false, name: string = ""): Pin {
        return new Pin(chip, output, name);
    }

    constructor(chip: string = "", output: boolean = false, name: string = "") {
        this._chip = chip;
        this._output = output;
        this._name = name;
    }

    public toJSON(): PinData {
        return {
            chip: this.chip,
            output: this.output,
            name: this.name,
        };
    }

    public fromJSON(data: { [k: string]: any }): Pin {
        this._chip = data.chip ?? this.chip;
        this._output = data.output ?? this.output;
        this._name = data.name ?? this.name;
        return this;
    }

    public isEqualTo(pin: Pin): boolean {
        return this.chip == pin.chip && this.output == pin.output && this.name == pin.name;
    }

    public get chip(): string { return this._chip; }
    public get output(): boolean { return this._output; }
    public get name(): string { return this._name; }
}

export default Pin;