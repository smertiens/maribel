import * as DOMFunctions from './dom.js';

class _PrimitiveProxyWrapper {
    public value: any;
    public originalType: string;

    constructor(value: any, tp: string) {
        this.value = value;
        this.originalType = tp;
    }
}

class _FormProxyWrapper {
    public value: string;
    public elem: HTMLElement;

    constructor(value: string, elem: HTMLElement) {
        this.value = value;
        this.elem = elem;
    }
}

class _FormProxyHandler implements ProxyHandler<_FormProxyWrapper> {
    private _marInst;
    private _elem: HTMLInputElement;

    constructor(marInst: Maribel, elem: HTMLInputElement) {
        this._marInst = marInst;
        this._elem = elem;
    }

    set(obj: Object, prop: string|symbol, value: any, receiver: any): boolean {
        Reflect.set(obj, prop, value);
        this._elem.value = value;
        this._marInst.updateState();
        return true;
    }
};

export default class Maribel {

    private _listeners: Map<string, [() => void]>;
    public dom: Object;
    
    constructor() {
        this._listeners = new Map();
        this.dom = DOMFunctions;
    }

    static create() {
        return new Maribel();
    }

    react(o: any) {
        const _jsfInst = this;

        const _objectProxyHandler: ProxyHandler<Object> = {
            set(obj: Object, prop: string|symbol, value: any, receiver: any): boolean {
                Reflect.set(obj, prop, value);
                _jsfInst.updateState();
                return true;
            }
        };

        const _primitiveProxyHandler: ProxyHandler<Object> = {
            set(obj: Object, prop: string|symbol, value: any, receiver: any): boolean {
                if (prop !== 'value') {
                    throw Error('Reactive primitives can only be assigned using "value" ')
                }

                // @ts-ignore
                obj.value = value;
                _jsfInst.updateState();
                return true;
            },

            get(target: _PrimitiveProxyWrapper, prop: string, receiver: Object): any {
                if (prop !== 'value') {
                    throw Error('Reactive primitives can only be read using "value" ')
                }

                return target.value;
            }
        }
        
        if (o instanceof Object) {
            return new Proxy(o, _objectProxyHandler);
        } else {
            console.log('reg ', o, typeof o);
            return new Proxy(
                new _PrimitiveProxyWrapper(o, typeof o), 
                _primitiveProxyHandler
            );
        }
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
        console.log('updating state');
        this._fire('state:changed');
    }

    bind(id: string): object {
        let formElem = document.getElementById(id);

        if (formElem === null) {
            // try name
            formElem = document.querySelector(`*[name=${id}]`);
        }

        if (formElem === null) {
            throw Error(`No element with id or name "${id}" found.`);
        }

        if (!['input', 'select', 'textarea'].includes(formElem.tagName.toLowerCase())) {
            throw Error('Element to bind to is not an input, select or textarea: ' + formElem.tagName);
        }

        const binding = new Proxy<_FormProxyWrapper>(
            new _FormProxyWrapper((formElem as HTMLInputElement).value, formElem),
            new _FormProxyHandler(this, formElem as HTMLInputElement)
        );

        formElem.addEventListener('keyup', (ev) => {
            binding.value = (ev.target as HTMLInputElement).value;
        });

        return binding;
    }
}