import type { Vec2 } from "../common/Transform";
import menuTemplate from "./views/rightClickMenu.twig";
import { twig, Template } from "twig";



class RightClickMenu {

    private id: string;

    private container: HTMLElement;
    private content: HTMLElement;

    private children: { [k: string]: RightClickMenu } = {};

    private action: (action: string[]) => void;

    private queuedHide: number = 0;

    private parent: RightClickMenu | null;


    constructor(htmlParent: HTMLElement, action: (action: string[]) => void, id: string = "root", data: { [k: string]: any }, parent: RightClickMenu | null = null) {
        this.id = id;
        this.action = action;
        this.container = document.createElement("div");
        this.container.style.position = "fixed";
        this.container.style.display = "none";
        this.container.className = "card right-click-menu";
        this.container.style.minWidth = "200px";
        this.content = document.createElement("div");
        this.container.appendChild(this.content);
        htmlParent.appendChild(this.container);
        this.container.addEventListener("mouseleave", e => this.queueHide(e));
        this.container.addEventListener("mouseover", e => this.mouseOver(e));
        this.container.addEventListener("mouseup", e => this.click(e));
        this.buildMenu(data);
        this.parent = parent;
    }

    public destroy() {
        Object.values(this.children).forEach(child => child.destroy());
        this.container.remove();
    }

    private buildMenu(structure: { [k: string]: any }) {
        const template: Template = twig({ data: menuTemplate });
        const items = Object.entries(structure).map(([name, value]) => this.buildMenuItem(name, value));
        const data = {
            items,
        };
        const render: string = template.render(data);
        this.content.innerHTML = render;
    }

    private buildMenuItem(name: string, data: any): { [k: string]: any } {
        const value = data == null ? null : (data.data ?? data);
        const result = {
            text: name.charAt(0).toUpperCase() + name.slice(1),
            type: value === null ? "break" : (value instanceof Array ? "action" : "menu"),
            value: value instanceof Array ? value : name,
            class: "",
        };
        if (data != null) {
            if (data.hasOwnProperty("requirements")) {
                result.class = ["has-reqs", ...data.requirements].join(" ");
            }
        }

        if (result.type == "menu") {
            this.children[name] = new RightClickMenu(this.container, this.action, `${this.id}>${name}`, value, this);
        }

        return result;
    }

    show(pos: Vec2, reqs: string[] = []) {
        pos = { ...pos };
        pos.x -= 2;
        pos.y -= 2;
        Object.values(this.children).forEach(child => child.hide());
        this.container.style.left = `${pos.x}px`;
        this.container.style.top = `${pos.y}px`;
        this.container.style.display = "";
        if (this.parent == null) {
            this.container.querySelectorAll(".has-reqs").forEach(e => {
                if (e instanceof HTMLElement) e.classList.add("disabled");
            });
            if (reqs.length > 0) {
                this.container.querySelectorAll(`.has-reqs.${reqs.join(", .has-reqs.")}`).forEach(e => {
                    if (e instanceof HTMLElement) e.classList.remove("disabled");
                });
            }
        }
    }

    private queueHide(_event: MouseEvent) {
        this.queuedHide = window.setTimeout(() => this.hide(), 250);
    }

    hide() {
        this.container.style.display = "none";
        this.hideChildren();
    }

    private hideChildren() {
        Object.values(this.children).forEach(child => child.hide());
    }

    hideParent() {
        if (this.parent) this.parent.hideParent();
        else this.hide();
    }

    public stopQueuedHide() {
        window.clearTimeout(this.queuedHide);
        this.parent?.stopQueuedHide();
    }

    private click(event: MouseEvent) {
        if (event.button != 0) return;
        event.stopImmediatePropagation();
        event.stopPropagation();
        const elem = event.target;
        if (elem instanceof HTMLElement) {
            if (elem.classList.contains("disabled")) return;
            const data = elem.dataset;
            if (data.type == "action") {
                const value = JSON.parse(data.value ?? "[]");
                if (value instanceof Array) this.action(value);
                this.hideParent();
            }
        }
    }

    private mouseOver(event: MouseEvent) {
        this.hideChildren();
        this.stopQueuedHide();
        event.stopImmediatePropagation();
        event.stopPropagation();
        let elem: HTMLElement | null = (event.target instanceof HTMLElement) ? event.target : null;
        if (elem instanceof HTMLElement) {
            let data = elem.dataset;
            if (data.child == "child") {
                elem = elem.parentElement;
                if (elem == null) return;
                data = elem.dataset;
            }
            if (data.type == "menu") {
                const value = JSON.parse(data.value ?? "null");
                if (this.children.hasOwnProperty(value)) {
                    const rect = elem.getBoundingClientRect();
                    this.children[value].show({ x: rect.right, y: rect.top + 6 });
                }
            }
        }
    }
}


export default RightClickMenu;