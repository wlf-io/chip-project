//import { Template } from "twig";

declare module "*.twig" {
    const template: string;
    export = template;
}

declare module "*StandardChips.json" {
    const value: { [k: string]: any };
    export = value;
}