import type Maribel from "./maribel";

export class _PrimitiveProxyWrapper {
    public value: any;
    public originalType: string;

    constructor(value: any, tp: string) {
        this.value = value;
        this.originalType = tp;
    }
}

export class _FormProxyWrapper {
    public value: string;
    public elem: HTMLElement;

    constructor(value: string, elem: HTMLElement) {
        this.value = value;
        this.elem = elem;
    }
}

export class _FormProxyHandler implements ProxyHandler<_FormProxyWrapper> {
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

export class _ObjectProxyHandler implements ProxyHandler<Object> {
    private _marInst;

    constructor(marInst: Maribel) {
        this._marInst = marInst;
    }

    set(obj: Object, prop: string|symbol, value: any, receiver: any): boolean {
        Reflect.set(obj, prop, value);
        this._marInst.updateState();
        return true;
    }
}

export class _PrimitiveProxyHandler implements ProxyHandler<Object> {
    private _marInst;

    constructor(marInst: Maribel) {
        this._marInst = marInst;
    }

    set(obj: Object, prop: string|symbol, value: any, receiver: any): boolean {
        if (prop !== 'value') {
            throw Error('Reactive primitives can only be assigned using "value" ')
        }

        // @ts-ignore
        obj.value = value;
        this._marInst.updateState();
        return true;
    }

    get(target: _PrimitiveProxyWrapper, prop: string, receiver: Object): any {
        if (prop !== 'value') {
            throw Error('Reactive primitives can only be read using "value" ')
        }

        return target.value;
    }
}