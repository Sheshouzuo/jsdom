"use strict";

const vm = require("vm");

const idlUtils = require("../generated/utils");

const ErrorEvent = require("../generated/ErrorEvent");

exports.appendHandler = function appendHandler(el, eventName) {
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
  });
};

// https://html.spec.whatwg.org/#event-handler-idl-attributes
exports.createEventAccessor = function createEventAccessor(obj, event) {
  Object.defineProperty(obj, "on" + event, {
    get() { // https://html.spec.whatwg.org/#getting-the-current-value-of-the-event-handler
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
      if (typeof val !== "function") { // we mix this into non-impl classes
        return;
      }

      // If we've never used the event attribute before, we now reserve a space in the list of
      // event handlers to make sure we always call them in the right order.
      if (!this._eventHandlers[event]) {
        exports.appendHandler(this, event);
      }
      this._eventHandlers[event] = val;
    }
  });
};
