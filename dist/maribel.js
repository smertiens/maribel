"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/dom.ts
  var dom_exports = {};
  __export(dom_exports, {
    hide: () => hide,
    show: () => show
  });
  function show(id) {
    const obj = window.document.getElementById(id);
    if (obj === null) return;
    if (obj.hasAttribute("x-display")) {
      if (obj.getAttribute("x-display") == "") {
        obj.style.removeProperty("display");
      } else {
        obj.style.display = obj.getAttribute("x-display");
      }
      obj.removeAttribute("x-display");
    } else {
      obj.style.removeProperty("display");
    }
  }
  function hide(id) {
    const obj = window.document.getElementById(id);
    if (obj === null) return;
    obj.setAttribute("x-display", obj.style.display);
    obj.style.display = "none";
  }

  // src/maribel.ts
  var _JSFPrimitiveValueWrapper = class {
    constructor(value, tp) {
      this.value = value;
      this.originalType = tp;
    }
  };
  var _FormProxyWrapper = class {
    constructor(value, elem) {
      this.value = value;
      this.elem = elem;
    }
  };
  var _FormProxyHandler = class {
    constructor(marInst, elem) {
      this._marInst = marInst;
      this._elem = elem;
    }
    set(obj, prop, value, receiver) {
      Reflect.set(obj, prop, value);
      this._elem.value = value;
      this._marInst.updateState();
      return true;
    }
  };
  var Maribel = class _Maribel {
    constructor() {
      this._listeners = /* @__PURE__ */ new Map();
      this.dom = dom_exports;
    }
    static create() {
      return new _Maribel();
    }
    react(o) {
      const _jsfInst = this;
      const _objectProxyHandler = {
        set(obj, prop, value, receiver) {
          Reflect.set(obj, prop, value);
          _jsfInst.updateState();
          return true;
        }
      };
      const _primitiveProxyHandler = {
        set(obj, prop, value, receiver) {
          if (prop !== "value") {
            throw Error('Reactive primitives can only be assigned using "value" ');
          }
          obj.value = value;
          _jsfInst.updateState();
          return true;
        },
        get(target, prop, receiver) {
          if (prop !== "value") {
            throw Error('Reactive primitives can only be read using "value" ');
          }
          return target.value;
        }
      };
      if (o instanceof Object) {
        return new Proxy(o, _objectProxyHandler);
      } else {
        console.log("reg ", o, typeof o);
        return new Proxy(
          new _JSFPrimitiveValueWrapper(o, typeof o),
          _primitiveProxyHandler
        );
      }
    }
    on(ev, listener) {
      if (this._listeners.has(ev)) {
        this._listeners.get(ev).push(listener);
      } else {
        this._listeners.set(ev, [listener]);
      }
    }
    _fire(ev) {
      if (!this._listeners.has(ev)) return;
      for (const listener of this._listeners.get(ev) ?? []) {
        listener();
      }
    }
    updateState() {
      console.log("updating state");
      this._fire("state:changed");
    }
    bind(id) {
      let formElem = document.getElementById(id);
      if (formElem === null) {
        formElem = document.querySelector(`*[name=${id}]`);
      }
      if (formElem === null) {
        throw Error(`No element with id or name "${id}" found.`);
      }
      if (!["input", "select", "textarea"].includes(formElem.tagName.toLowerCase())) {
        throw Error("Element to bind to is not an input, select or textarea: " + formElem.tagName);
      }
      const binding = new Proxy(
        new _FormProxyWrapper(formElem.value, formElem),
        new _FormProxyHandler(this, formElem)
      );
      formElem.addEventListener("keyup", (ev) => {
        binding.value = ev.target.value;
      });
      return binding;
    }
  };

  // src/browser.ts
  window.Maribel = Maribel;
})();
