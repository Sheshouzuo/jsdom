"use strict";

const { appendHandler, createEventAccessor } = require("../helpers/create-event-accessor");

const events = new Set([
  "afterprint",
  "beforeprint",
  "beforeunload",
  "hashchange",
  "languagechange",
  "message",
  "offline",
  "online",
  "pagehide",
  "pageshow",
  "popstate",
  "rejectionhandled",
  "storage",
  "unhandledrejection",
  "unload"
]);

class WindowEventHandlersImpl {
  _windowEventChanged(event) {
    const propName = "on" + event;
    if (!events.has(event)) {
      return;
    }

    const val = this.getAttribute(propName);

    if (this.constructor.name !== "Window" || !this._document) {
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
  createEventAccessor(WindowEventHandlersImpl.prototype, event);
}

module.exports = {
  implementation: WindowEventHandlersImpl
};
