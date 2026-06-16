import React from "react";
import { renderToString } from "react-dom/server";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

import WinnowAI from "./src/WinnowAI.tsx";try {
  renderToString(<WinnowAI />);
  console.log("Initial render OK.");
} catch (e) {
  console.error("Crash during initial render:", e);
}
