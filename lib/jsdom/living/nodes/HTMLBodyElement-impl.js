"use strict";

const HTMLElementImpl = require("./HTMLElement-impl").implementation;

const idlUtils = require("../generated/utils");
const WindowEventHandlersImpl = require("./WindowEventHandlers-impl").implementation;

class HTMLBodyElementImpl extends HTMLElementImpl {
  _attrModified(name, value, oldValue) {
    super._attrModified.apply(this, arguments);

    if (name.startsWith("on")) {
      this._windowEventChanged(name.substring(2));
    }
  }
}

idlUtils.mixin(HTMLBodyElementImpl.prototype, WindowEventHandlersImpl.prototype);

module.exports = {
  implementation: HTMLBodyElementImpl
};
