"use strict";

const vm = require("vm");

const idlUtils = require("../generated/utils");

const ErrorEvent = require("../generated/ErrorEvent");

const events = new Set([
  "abort", "autocomplete",
  "autocompleteerror", "blur",
  "cancel", "canplay", "canplaythrough",
  "change", "click",
  "close", "contextmenu",
  "cuechange", "dblclick",
  "drag", "dragend",
  "dragenter", "dragexit",
  "dragleave", "dragover",
  "dragstart", "drop",
  "durationchange", "emptied",
  "ended", "error", "focus",
  "input", "invalid",
  "keydown", "keypress",
  "keyup", "load", "loadeddata",
  "loadedmetadata", "loadstart",
  "mousedown", "mouseenter",
  "mouseleave", "mousemove",
  "mouseout", "mouseover",
  "mouseup", "wheel",
  "pause", "play",
  "playing", "progress",
  "ratechange", "reset",
  "resize", "scroll",
  "seeked", "seeking",
  "select", "show",
  "sort", "stalled",
  "submit", "suspend",
  "timeupdate", "toggle",
  "volumechange", "waiting"
]);

const inheritedAttributes = new Set(["blur", "error", "focus", "load", "resize", "scroll"]);

function appendHandler(el, eventName) {
  el.addEventListener(eventName, event => {
    event = idlUtils.implForWrapper(event);

    const callback = el["on" + eventName];
    if (!callback) {
      return;
    }

    let returnValue = null;
    if (ErrorEvent.isImpl(event)/* && callback is OnErrorEventHandler*/) {

    } else {
      returnValue = callback.call(event.currentTarget, event);
    }

    if (eventName === "mouseover" || (eventName === "error" && ErrorEvent.isImpl(event))) {
      if (returnValue) {
        event._canceledFlag = true;
      }
    // TODO: before unload
    } else if (!returnValue) {
      event._canceledFlag = true;
    }
  }, false);
}

function createEventMethod(obj, event) {
  Object.defineProperty(obj, "on" + event, {
    get() {
      if (inheritedAttributes.has(event) && (this.tagName === "BODY" || this.tagName === "FRAMESET")) {
        return this.ownerDocument.defaultView["on" + event] === undefined ? null : this.ownerDocument.defaultView["on" + event];
      }

      const value = this._eventHandlers[event];
      if (!value) {
        return null;
      }

      if (value.body !== undefined) {
        let element;
        let formOwner = null;
        let document;
        let window;
        if (this.constructor.name === "Window") {
          element = null;
          window = this;
          document = idlUtils.implForWrapper(this.document);
        } else {
          element = this;
          document = element.ownerDocument;
          window = document.defaultView;
        }
        const body = value.body;
        // TODO: location
        if (element !== null) {
          formOwner = element.form || null;
        }

        try {
          // eslint-disable-next-line no-new-func
          Function(body); // properly error out on syntax errors
        } catch (e) {
          // TODO: Report the error
          return null;
        }

        let fn;
        const Constructor = vm.isContext(document._global) ? document.defaultView._globalProxy.Function : Function;
        if (event === "error" && element === null) {
          // eslint-disable-next-line no-new-func
          fn = new Constructor(`return function onerror(event, source, lineno, colno, error) {
  ${body}
};`)(document);
        } else {
          const argNames = [];
          const args = [];
          if (element !== null) {
            argNames.push("document");
            args.push(document);
          }
          if (formOwner !== null) {
            argNames.push("formOwner");
            args.push(formOwner);
          }
          if (element !== null) {
            argNames.push("element");
            args.push(element);
          }
          let wrapperBody = `
return function on${event}(event) {
  ${body}
};`;
          for (let i = argNames.length - 1; i >= 0; --i) {
            wrapperBody = `with (${argNames[i]}) { ${wrapperBody} }`;
          }
          argNames.push(wrapperBody);
          fn = Constructor(...argNames)(...args);
        }
        this._eventHandlers[event] = fn;
      }
      return this._eventHandlers[event];
    },
    set(val) {
      if (!(typeof val === "function")) {
        return;
      }
      if (inheritedAttributes.has(event) && (this.tagName === "BODY" || this.tagName === "FRAMESET")) { // still not great at detecting this
        this.ownerDocument.defaultView["on" + event] = val;
        return;
      }

      if (!this._eventHandlers[event]) {
        appendHandler(this, event);
      }
      this._eventHandlers[event] = val;
    }
  });
}

class GlobalEventHandlersImpl {
  _initGlobalEvents() {
    this._eventHandlers = Object.create(null);
  }

  _eventChanged(event) {
    const propName = "on" + event;
    if (!events.has(event)) {
      return;
    }

    const val = this.getAttribute(propName);

    if (inheritedAttributes.has(event) && (this.tagName === "BODY" || this.tagName === "FRAMESET")) { // still not great at detecting this
      if (!this.ownerDocument.defaultView._eventHandlers[event]) {
        appendHandler(this.ownerDocument.defaultView, event);
      }

      this.ownerDocument.defaultView._eventHandlers[event] = {
        body: val
      };
    } else {
      if (!this._eventHandlers[event]) {
        appendHandler(this, event);
      }

      this._eventHandlers[event] = {
        body: val
      };
    }
  }
}

for (const event of events) {
  createEventMethod(GlobalEventHandlersImpl.prototype, event);
}

module.exports = {
  implementation: GlobalEventHandlersImpl
};
