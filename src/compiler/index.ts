import Compiler from "./Compiler";


declare global {
    interface Window { ChipCompiler: typeof Compiler; }
}

window.ChipCompiler = Compiler;