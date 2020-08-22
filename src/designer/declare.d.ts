declare module '*.twig' {
    const value: string;
    export = value;
}

declare module "*StandardChips.json" {
    const value: { [k: string]: any };
    export = value;
}