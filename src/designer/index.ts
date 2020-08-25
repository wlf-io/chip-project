import Designer from "./Designer";


function ready(fn: Function) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', () => fn());
    }
}


ready(() => {
    if (window.opener && window.opener !== window) {
        document.body.textContent = "POPUP";
    } else {
        Designer.Factory({ chipType: "BaseChip" })
            .run();
    }
});
