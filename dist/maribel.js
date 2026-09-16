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
    replaceContent: () => replaceContent,
    show: () => show
  });
  function show(id) {
    const obj = window.document.getElementById(id);
    if (obj === null) return;
    if (obj.hasAttribute("mar-display")) {
      if (obj.getAttribute("mar-display") == "") {
        obj.style.removeProperty("display");
      } else {
        obj.style.display = obj.getAttribute("mar-display");
      }
      obj.removeAttribute("mar-display");
    } else {
      obj.style.removeProperty("display");
    }
  }
  function hide(id) {
    const obj = window.document.getElementById(id);
    if (obj === null) return;
    obj.setAttribute("mar-display", obj.style.display);
    obj.style.display = "none";
  }
  function replaceContent(id, content) {
    const obj = window.document.getElementById(id);
    if (obj === null) return;
    obj.innerHTML = content;
  }

  // src/http.ts
  var HTTPResponse = class {
    constructor(nativeResponse) {
      this._resp = nativeResponse;
    }
    or(func) {
      this._errorHandler = func;
      return this;
    }
    async loadInto(id) {
      const data = await this.content() ?? "";
      replaceContent(id, data);
    }
    async _readResponseContent(asJSON) {
      try {
        if (this._resp.ok) {
          return asJSON ? await this._resp.json() : await this._resp.text();
        } else {
          console.log(this);
          throw Error(`Request failed, got status: ${this._resp.status}`);
        }
      } catch (ex) {
        this._handleException(ex);
      }
      return null;
    }
    async json() {
      return await this._readResponseContent(true);
    }
    async content() {
      return await this._readResponseContent(false);
    }
    _handleException(ex) {
      if (this._errorHandler !== void 0) {
        this._errorHandler(ex);
      } else {
        throw ex;
      }
    }
  };
  var HTTPClient = class {
    constructor() {
    }
    async get(url, headers) {
      return this._handleResponse(
        await fetch(
          this._buildRequest(url, "GET", void 0, headers)
        )
      );
    }
    async post(url, body, headers) {
      return this._handleResponse(
        await fetch(
          this._buildRequest(url, "GET", body, headers)
        )
      );
    }
    async put(url, body, headers) {
      return this._handleResponse(
        await fetch(
          this._buildRequest(url, "GET", body, headers)
        )
      );
    }
    async delete(url, headers) {
      return this._handleResponse(
        await fetch(
          this._buildRequest(url, "GET", void 0, headers)
        )
      );
    }
    _buildRequest(url, method, body, headers) {
      if (body && ["PUT", "POST"].includes(method)) {
        return new Request(url, {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            ...headers
          }
        });
      } else {
        return new Request(url, {
          method,
          headers: headers ?? {}
        });
      }
    }
    _handleResponse(resp) {
      return new HTTPResponse(resp);
    }
  };

  // src/proxies.ts
  var _PrimitiveProxyWrapper = class {
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
  var _ObjectProxyHandler = class {
    constructor(marInst) {
      this._marInst = marInst;
    }
    set(obj, prop, value, receiver) {
      Reflect.set(obj, prop, value);
      this._marInst.updateState();
      return true;
    }
  };
  var _PrimitiveProxyHandler = class {
    constructor(marInst) {
      this._marInst = marInst;
    }
    set(obj, prop, value, receiver) {
      if (prop !== "value") {
        throw Error('Reactive primitives can only be assigned using "value" ');
      }
      obj.value = value;
      this._marInst.updateState();
      return true;
    }
    get(target, prop, receiver) {
      if (prop !== "value") {
        throw Error('Reactive primitives can only be read using "value" ');
      }
      return target.value;
    }
  };

  // src/maribel.ts
  var exprRegex = /\[\[\s*([^\]]+)\s*\]\]/mg;
  var renderInterval = 100;
  var Maribel = class _Maribel {
    constructor(options) {
      this._listeners = /* @__PURE__ */ new Map();
      this.dom = dom_exports;
      this.http = new HTTPClient();
      this._renderable = [];
      this._pendingUpdate = false;
      this._rendering = false;
      this._renderInterval = null;
      this._data = {};
      this._options = {
        root: "body",
        ...options
      };
      const that = this;
      window.addEventListener("DOMContentLoaded", () => {
        that._init();
      });
    }
    data(obj) {
      this._data = obj;
      return obj;
    }
    get d() {
      return this._data;
    }
    static create(options) {
      return new _Maribel(options);
    }
    _init() {
      for (const node of document.querySelectorAll(`${this._options.root} *`)) {
        if (["SCRIPT", "STYLE"].includes(node.tagName))
          continue;
        let template = "";
        let attribs = [];
        if (node.textContent.match(exprRegex) !== null) {
          template = node.textContent;
        }
        for (const attribute of node.getAttributeNames()) {
          if (attribute.startsWith("@")) {
            attribs.push({
              attribName: attribute.substring(1),
              expr: node.getAttribute(attribute) || ""
            });
            node.removeAttribute(attribute);
          }
        }
        if (template.length > 0 || attribs.length > 0) {
          this._renderable.push({
            attribs,
            template,
            elem: node
          });
        }
      }
      this._render();
      this._renderInterval = window.setInterval(() => {
        this._renderScheduler();
      }, renderInterval);
      this._fire("ready");
    }
    _renderScheduler() {
      if (!this._pendingUpdate || this._rendering) return;
      this._render();
    }
    statefulObject(o) {
      if (!(o instanceof Object)) throw Error("Use Maribel.statefulValue for non-objects");
      return new Proxy(o, new _ObjectProxyHandler(this));
    }
    statefulValue(o) {
      if (o instanceof Object) throw Error("Use Maribel.statefulObject for objects");
      return new Proxy(
        new _PrimitiveProxyWrapper(o, typeof o),
        new _PrimitiveProxyHandler(this)
      );
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
      this._pendingUpdate = true;
      this._fire("state:changed");
    }
    _render() {
      this._rendering = true;
      const p = 1;
      for (const dynNode of this._renderable) {
        if (dynNode.template.length > 0) {
          dynNode.elem.textContent = dynNode.template.replaceAll(
            exprRegex,
            (str, grp1, offset) => {
              return new Function(
                ...Object.keys(this._data),
                `return (${grp1.trim()});`
              )(...Object.values(this._data));
            }
          );
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
