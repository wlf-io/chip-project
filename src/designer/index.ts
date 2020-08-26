import Designer from "./Designer";


function ready(fn: Function) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', () => fn());
    }
}
let designer: Designer | null = null;

ready(() => {
    window.addEventListener("message", (msg: MessageEvent) => {
        if (designer) designer.message(msg);
        else if (typeof msg.data == "object") {
            switch ((msg.data["action"] ?? "").toLowerCase()) {
                case "start":
                    designer = Designer.Factory(msg.data["data"]);
                    break;
            }
        }
    });
    console.log(window.opener, window.opener !== window);
    if (window.opener && window.opener !== window) {
        window.opener.postMessage({ action: "ready" }, "*");
    } else {
        designer = Designer.Factory({ chipType: "BaseChip" });
    }
});
