import Designer from "./Designer";


function ready(fn: Function) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', () => fn());
    }
}


ready(() => {
    Designer.Factory("BaseChip")
        .run();
});
