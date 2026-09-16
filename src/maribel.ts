import * as DOMFunctions from './dom.js';
import { HTTPClient } from './http.js';
import { _ObjectProxyHandler, _FormProxyHandler, _FormProxyWrapper, 
    _PrimitiveProxyHandler, _PrimitiveProxyWrapper } from './proxies.js';
    
interface MaribelOptions {
    root: string
}

interface DynamicNode {
    elem: Element,
    template: string,
    attribs: DynamicAttrib[]
};

interface DynamicAttrib {
    attribName: string,
    expr: string
}

const exprRegex = /\[\[\s*([^\]]+)\s*\]\]/mg;
const renderInterval = 100;

export default class Maribel {

    private _listeners: Map<string, [() => void]>;
    public dom: Object;
    public http: Object;
    private _options: MaribelOptions;
    private _renderable: DynamicNode[];
    private _pendingUpdate: boolean;
    private _rendering: boolean;
    private _renderInterval: number | null;
    private _data: Record<string, any>;
    
    constructor(options?: MaribelOptions) {
        this._listeners = new Map();
        this.dom = DOMFunctions;
        this.http = new HTTPClient();
        this._renderable = [];
        this._pendingUpdate = false;
        this._rendering = false;
        this._renderInterval = null;
        this._data = {};

        // Default options
        this._options = {
            root: 'body',
            ... options
        };

        const that = this;
        
        window.addEventListener('DOMContentLoaded', () => {
            that._init();
        });
    }

    public data(obj: Record<string, any>): Record<string, any> {
        this._data = obj;
        return obj;
    }

    get d(): Record<string, any> {
        return this._data;
    }

    static create(options?: MaribelOptions) {
        return new Maribel(options);
    }

    private _init() {
        for (const node of document.querySelectorAll(`${this._options.root} *`)) {
            if (["SCRIPT", "STYLE"].includes(node.tagName)) 
                continue;

            let template = '';
            let attribs: DynamicAttrib[] = [];

            // find dynamic content
            if (node.textContent.match(exprRegex) !== null) {
                template = node.textContent;
            }

            for (const attribute of node.getAttributeNames()) {
                if (attribute.startsWith('@')) {
                    attribs.push({
                        attribName: attribute.substring(1),
                        expr: node.getAttribute(attribute) || ""
                    });

                    node.removeAttribute(attribute);
                }
            }

            if (template.length > 0 || attribs.length > 0) {
                this._renderable.push({
                    attribs: attribs,
                    template: template,
                    elem: node
                });
            }
        }

        this._render();
        this._renderInterval = window.setInterval(() => { this._renderScheduler() }, renderInterval);
        this._fire('ready');
    }

    private _renderScheduler() {
        if (!this._pendingUpdate || this._rendering) return;
        this._render();
    }

    statefulObject(o: object) {
        if (!(o instanceof Object)) throw Error('Use Maribel.statefulValue for non-objects');
        
        return new Proxy(o, new _ObjectProxyHandler(this));
    }

    statefulValue(o: any) {
        if (o instanceof Object) throw Error('Use Maribel.statefulObject for objects');

        return new Proxy(
            new _PrimitiveProxyWrapper(o, typeof o), 
            new _PrimitiveProxyHandler(this)
        );
    }

    on(ev: string, listener: () => void): void {
        if (this._listeners.has(ev)) {
            this._listeners.get(ev)!.push(listener);
        } else {
            this._listeners.set(ev, [listener]);
        }
    }

    _fire(ev: string): void {
        if (! this._listeners.has(ev)) return;

        for (const listener of this._listeners.get(ev) ?? []) {
            listener();
        }
    }

    updateState() {
        this._pendingUpdate = true;
        this._fire('state:changed');
    }

    private _render() {
        this._rendering = true;
        const p=1;
        for (const dynNode of this._renderable) {
            if (dynNode.template.length > 0) {
                dynNode.elem.textContent = dynNode.template.replaceAll(
                    exprRegex, 
                    (str, grp1, offset) => {
                        return new Function(
                            ...Object.keys(this._data),
                            `return (${grp1.trim()});`
                        )(...Object.values(this._data));
                    })
                ;
            }

            if (dynNode.attribs.length > 0) {
                for (const dynAttrib of dynNode.attribs) {
                    dynNode.elem.setAttribute(
                        dynAttrib.attribName,
                        new Function(
                            ...Object.keys(this._data),
                            `return (${dynAttrib.expr});`
                        )(...Object.values(this._data))
                    );
                }
            }
        }

        this._rendering = false;
        this._pendingUpdate = false;
    }

    bind(id: string): object {
        let formElem = document.getElementById(id) as HTMLInputElement;

        if (formElem === null) {
            // try name
            formElem = document.querySelector(`*[name=${id}]`) as HTMLInputElement;
        }

        if (formElem === null) {
            throw Error(`No element with id or name "${id}" found.`);
        }

        if (!['input', 'select', 'textarea'].includes(formElem.tagName.toLowerCase())) {
            throw Error('Element to bind to is not an input, select or textarea: ' + formElem.tagName);
        }

        const binding = new Proxy<_FormProxyWrapper>(
            new _FormProxyWrapper(formElem.value, formElem),
            new _FormProxyHandler(this, formElem)
        );

        formElem.addEventListener('keyup', (ev: KeyboardEvent) => {
            binding.value = (ev.target as HTMLInputElement).value;
        });

        return binding;
    }
}