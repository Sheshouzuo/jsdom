"use strict";

const HTMLElementImpl = require("./HTMLElement-impl").implementation;

class HTMLFramesetElementImpl extends HTMLElementImpl {
  _attrModified(name, value, oldValue) {
    super._attrModified.apply(this, arguments);

    if (name.startsWith("on")) {
      this._windowEventChanged(name.substring(2));
    }
  }
}

module.exports = {
  implementation: HTMLFramesetElementImpl
};
