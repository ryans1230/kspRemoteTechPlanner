import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MARK, inTableSection, parseAttribute, splitParts } from "../js/html.js";

describe("splitParts", () => {
  it("returns the whole value when there is nothing to interpolate", () => {
    assert.deepEqual(splitParts("btn btn-primary"), [{ text: "btn btn-primary" }]);
    assert.deepEqual(splitParts(""), []);
  });

  it("finds a single slot", () => {
    assert.deepEqual(splitParts(`${MARK}0${MARK}`), [{ slot: 0 }]);
  });

  it("keeps the literal text around a slot", () => {
    assert.deepEqual(splitParts(`btn ${MARK}1${MARK} active`), [
      { text: "btn " },
      { slot: 1 },
      { text: " active" },
    ]);
  });

  it("finds adjacent slots", () => {
    assert.deepEqual(splitParts(`${MARK}0${MARK}-${MARK}1${MARK}`), [{ slot: 0 }, { text: "-" }, { slot: 1 }]);
  });

  it("does not confuse the digits inside a slot with the index", () => {
    assert.deepEqual(splitParts(`a ${MARK}12${MARK}`), [{ text: "a " }, { slot: 12 }]);
  });
});

describe("parseAttribute", () => {
  it("reads a plain attribute", () => {
    assert.deepEqual(parseAttribute("id", "body"), {
      name: "id",
      kind: "attribute",
      parts: [{ text: "body" }],
    });
  });

  it("reads a property binding", () => {
    assert.deepEqual(parseAttribute(".value", `${MARK}0${MARK}`), {
      name: "value",
      kind: "property",
      parts: [{ slot: 0 }],
    });
  });

  it("reads an event binding", () => {
    assert.deepEqual(parseAttribute("@click", `${MARK}0${MARK}`), {
      name: "click",
      kind: "event",
      parts: [{ slot: 0 }],
    });
  });

  it("keeps the capitalisation of an SVG attribute", () => {
    assert.deepEqual(parseAttribute("viewBox", "-400 -400 800 800"), {
      name: "viewBox",
      kind: "attribute",
      parts: [{ text: "-400 -400 800 800" }],
    });
  });
});

// A list only reaches its items once it is in the document, and there is no
// DOM here to put it in, so `each` itself has no test here. Everything it is
// built from is covered: the signals it reads, and the parsing of what a
// template writes.

describe("inTableSection", () => {
  it("is true inside a table body", () => {
    assert.equal(inTableSection("<table><tbody>\n  "), true);
  });

  it("is true inside a table head or foot", () => {
    assert.equal(inTableSection("<table><thead>"), true);
    assert.equal(inTableSection("<table><tfoot>"), true);
  });

  it("is false once the section has been closed", () => {
    assert.equal(inTableSection("<table><tbody>${rows}</tbody><tr>"), false);
  });

  it("is false for a slot inside a cell, which cannot be moved", () => {
    assert.equal(inTableSection("<table><tbody><tr><td>"), false);
  });

  it("is false for a slot that is not in a table at all", () => {
    assert.equal(inTableSection("<div class=\"card\"><p>"), false);
  });

  it("does not mistake a table word in text for a tag", () => {
    assert.equal(inTableSection("<p>the table is closed</p><p>"), false);
  });
});
