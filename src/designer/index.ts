import Designer from "./Designer";


function ready(fn: Function) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', () => fn());
    }
}


ready(() => {
    const canvas = document.querySelector("canvas");

    if (canvas instanceof HTMLCanvasElement) {
        Designer.Factory("BaseChip")
            .setCanvas(canvas)
            .setChipSize({ x: 8, y: 5 })
            .run();
    } else {
        console.error("HTML FAIL");
    }
});
