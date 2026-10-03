/**
 * A tiny HTML template layer.
 *
 * {@link html} is a tagged template that parses its static markup once and
 * then keeps the parts that depend on a {@link module:reactive.Signal} in
 * sync, which is all the templating this app needs. An interpolated signal
 * updates in place, so a view is never torn down and rebuilt: a field you
 * are typing in keeps focus, and the DOM work is proportional to what
 * changed.
 *
 * Syntax:
 *
 * - `${signal}` in text position updates the text, or swaps in nodes when
 *   the value is a {@link Fragment} or a node.
 * - `name=${value}` sets an attribute, and `class="a ${flag}"` mixes
 *   static and dynamic text.
 * - `.name=${value}` sets a property instead, for the cases an attribute
 *   cannot express (`input.value`).
 * - `@name=${handler}` adds an event listener. The handler has to be a
 *   reference to a function, not an inline expression: unquoted attribute
 *   values stop at the first space.
 * - {@link each} renders a list and reuses the nodes of rows whose key
 *   survived the change.
 *
 * Capitalisation is the parser's problem, not this module's: parsing HTML
 * restores the camel case of SVG names such as `viewBox`, so templates can
 * write them the SVG way.
 *
 * @module
 */

import { effect, isSignal, untrack } from "./reactive.js";

/**
 * Delimits an interpolated value inside the generated markup. Random, so it
 * cannot collide with the template's own content, and plain enough to
 * survive HTML parsing in both text and attribute position. Exported for the
 * benefit of the tests of {@link splitParts}.
 */
export const MARK = `ksp${Math.random().toString(36).slice(2)}`;

/**
 * Matches one interpolation slot and captures its index.
 */
const SLOT = new RegExp(`${MARK}(\\d+)${MARK}`, "g");

/**
 * One piece of an attribute value: either literal text or the index of an
 * interpolated value.
 *
 * @typedef {{text: string}|{slot: number}} Part
 */

/**
 * Reads a written attribute name, such as `.value`, `@click`, or `ref=`.
 *
 * @param {string} name
 * @param {string} raw
 * @returns {{name: string, kind: "attribute"|"property"|"event"|"ref", parts: Part[]}}
 */
export function parseAttribute(name, raw) {
  /** @type {"attribute"|"property"|"event"|"ref"} */
  let kind = "attribute";
  if (name.startsWith(".")) {
    kind = "property";
    name = name.slice(1);
  } else if (name.startsWith("@")) {
    kind = "event";
    name = name.slice(1);
  } else if (name === "ref") {
    kind = "ref";
  }
  return { name, kind, parts: splitParts(raw) };
}

/**
 * Splits an attribute value into literal text and interpolation slots.
 *
 * @param {string} raw
 * @returns {Part[]}
 */
export function splitParts(raw) {
  /** @type {Part[]} */
  const parts = [];
  let end = 0;
  for (const match of raw.matchAll(SLOT)) {
    if (match.index > end) parts.push({ text: raw.slice(end, match.index) });
    parts.push({ slot: Number(match[1]) });
    end = match.index + match[0].length;
  }
  if (end < raw.length) parts.push({ text: raw.slice(end) });
  return parts;
}

/**
 * A group of nodes that behaves like a single value, so a template can
 * interpolate markup as easily as text.
 */
export class Fragment {
  /**
   * @param {Node[]} [nodes]
   */
  constructor(nodes = []) {
    /** @type {Node[]} */
    this.nodes = nodes;
  }

  /**
   * @param {Node} parent
   * @param {Node|null} [before]
   * @returns {void}
   */
  insert(parent, before = null) {
    for (const node of this.nodes) parent.insertBefore(node, before);
  }
}

/**
 * Lists that were built while still detached and owe us a first sync.
 *
 * @type {Set<EachList<unknown>>}
 */
const pending = new Set();

/**
 * Syncs every detached list, including any created while doing so.
 *
 * @returns {void}
 */
function flushPending() {
  while (pending.size > 0) {
    for (const list of [...pending]) {
      pending.delete(list);
      list.sync();
    }
  }
}

/**
 * Renders a list, keeping the nodes of rows whose key is unchanged.
 *
 * A row is only rendered again when its key appears or disappears, never
 * when its contents change, because the bindings inside a row are live: a
 * value changing updates the one field that shows it. That is what lets you
 * keep typing in a quantity field while the rest of the row stays put.
 *
 * @template T
 * @extends {Fragment}
 */
class EachList extends Fragment {
  /**
   * @param {import("./reactive.js").Signal<readonly T[]>} list
   * @param {(item: T, index: number) => unknown} keyOf
   * @param {(item: T, index: number) => unknown} render
   */
  constructor(list, keyOf, render) {
    super([document.createTextNode("")]);
    this._anchor = /** @type {Text} */ (this.nodes[0]);
    this._keyOf = keyOf;
    this._render = render;
    /** @type {readonly T[]} */
    this._items = [];
    /** @type {Map<unknown, Node[]>} */
    this._rendered = new Map();
    // The effect is never disposed: a view lives as long as the page does.
    effect(() => {
      this._items = list.value;
      untrack(() => this.sync());
    });
    pending.add(this);
  }

  /**
   * @param {Node} parent
   * @param {Node|null} [before]
   * @returns {void}
   */
  insert(parent, before = null) {
    super.insert(parent, before);
    if (this._anchor.parentNode) this.sync();
    else pending.add(this);
  }

  /**
   * Brings the DOM in line with the list. Does nothing while the list is
   * still detached, where {@link flushPending} takes over.
   *
   * @returns {void}
   */
  sync() {
    const parent = this._anchor.parentNode;
    if (!parent) return;

    const previous = this._rendered;
    /** @type {Map<unknown, Node[]>} */
    const next = new Map();
    for (const [index, item] of this._items.entries()) {
      const key = this._keyOf(item, index);
      if (next.has(key)) continue;
      const kept = previous.get(key);
      if (kept) {
        next.set(key, kept);
        continue;
      }
      const staging = document.createDocumentFragment();
      insertInto(staging, this._render(item, index));
      next.set(key, [...staging.childNodes]);
    }
    for (const [key, nodes] of previous) {
      if (next.has(key)) continue;
      for (const node of nodes) node.remove();
    }

    let reference = this._anchor;
    for (const [, nodes] of [...next].reverse()) {
      for (const node of [...nodes].reverse()) {
        const isPlaced = node.parentNode === parent && node.nextSibling === reference;
        if (!isPlaced) parent.insertBefore(node, reference);
        reference = node;
      }
    }

    this._rendered = next;
  }
}

/**
 * Builds a list out of a signal. Keys have to be stable and unique; rows
 * with a repeated key are rendered once, for the first of them.
 *
 * Both callbacks are given the row's index as well, which is what lets a list
 * be keyed by position: the nodes of a row are reused as long as its key
 * survives, so anything inside a row has to be bound to the live list rather
 * than to the item it was rendered from.
 *
 * @template T
 * @param {import("./reactive.js").Signal<readonly T[]>} list
 * @param {(item: T, index: number) => unknown} keyOf
 * @param {(item: T, index: number) => unknown} render returns nodes, a string or a Fragment
 * @returns {Fragment}
 */
export function each(list, keyOf, render) {
  return new EachList(list, keyOf, render);
}

/**
 * Puts `content` into `parent` as nodes. Anything that is not a node, a
 * {@link Fragment} or an array of those is treated as text.
 *
 * @param {Node} parent
 * @param {unknown} content
 * @param {Node|null} [before]
 * @returns {void}
 */
export function insertInto(parent, content, before = null) {
  if (content == null || content === false) return;
  if (content instanceof Fragment) {
    content.insert(parent, before);
    return;
  }
  if (content instanceof Node) {
    parent.insertBefore(content, before);
    return;
  }
  if (Array.isArray(content)) {
    for (const item of content) insertInto(parent, item, before);
    return;
  }
  parent.insertBefore(document.createTextNode(String(content)), before);
}

/**
 * Replaces everything inside `parent` with `content`.
 *
 * @param {Element} parent
 * @param {unknown} content
 * @returns {void}
 */
export function mount(parent, content) {
  parent.replaceChildren();
  insertInto(parent, content);
  flushPending();
}

/**
 * Names the row marker carries. A row marker is an element rather than text, so
 * that a parser has no reason to move a list out of the table it belongs to.
 */
const ROW_MARK = "data-ksp-row";

/** The tags whose direct children have to be rows or captions. */
const SECTION_TAGS = ["table", "thead", "tbody", "tfoot"];

/** Any tag, opening or closing. */
const TAG = /<(\/?)([a-z][a-z0-9]*)[^>]*>/gi;

/**
 * Whether a slot about to be written at the end of `markup` sits directly
 * inside a table section, where a parser is allowed to foster-parent content
 * back out of the table.
 *
 * A slot anywhere else is safe, because everything else can hold text: it is
 * only a table section that cannot, and that only for its direct children.
 *
 * @param {string} markup
 * @returns {boolean}
 */
export function inTableSection(markup) {
  // The tags left open, innermost last.
  const open = [];
  for (const [text, closing, name] of markup.matchAll(TAG)) {
    const tag = name.toLowerCase();
    if (closing === "/") {
      const at = open.lastIndexOf(tag);
      if (at >= 0) open.splice(at, 1);
    } else if (!text.endsWith("/>")) {
      open.push(tag);
    }
  }
  return SECTION_TAGS.includes(open[open.length - 1] ?? "");
}

/**
 * The element a template was written around, for the callers that need to hold
 * on to it — a dialog that is shown later, say. The whitespace a template
 * literal is written with is part of the markup, so the element is not
 * necessarily the first node.
 *
 * @param {Fragment} fragment
 * @returns {Element|null}
 */
export function element(fragment) {
  for (const node of fragment.nodes) {
    if (node.nodeType === 1) return /** @type {Element} */ (node);
  }
  return null;
}

/**
 * Renders a template literal into nodes. Interpolated signals stay wired to
 * the nodes they produced.
 *
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {Fragment}
 */
export function html(strings, ...values) {
  let markup = "";
  strings.forEach((text, index) => {
    markup += text;
    if (index >= values.length) return;
    // Text written straight into a table section is not safe: a parser may
    // move it out of the table, which would leave the rows of a list loose
    // beside it. A row element is always allowed there, so a slot in that
    // position is written as one and replaced once the markup is parsed.
    markup += inTableSection(markup)
      ? `<tr ${ROW_MARK}="${index}"></tr>`
      : `${MARK}${index}${MARK}`;
  });

  const template = document.createElement("template");
  template.innerHTML = markup;
  bind(template.content, values);

  const result = new Fragment();
  result.nodes = [...template.content.childNodes];
  return result;
}

/**
 * Recursively wires up the bindings of a freshly parsed tree.
 *
 * @param {Node} parent
 * @param {unknown[]} values
 * @returns {void}
 */
function bind(parent, values) {
  for (const child of [...parent.childNodes]) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = /** @type {Element} */ (child);
      const row = element.getAttribute(ROW_MARK);
      if (row !== null) {
        // A slot written inside a table section is parsed as a row, and
        // this is where that row is traded for whatever the slot holds.
        element.removeAttribute(ROW_MARK);
        parent.replaceChild(slot(values[Number(row)]), element);
        continue;
      }
      for (const attribute of [...element.attributes]) {
        bindAttribute(element, attribute.name, attribute.value, values);
      }
      bind(element, values);
    } else if (child.nodeType === Node.TEXT_NODE) {
      const raw = child.nodeValue ?? "";
      if (!raw.includes(MARK)) continue;
      parent.replaceChild(textNodes(raw, values), child);
    }
  }
}

/**
 * Turns a piece of text with interpolation slots into nodes.
 *
 * @param {string} raw
 * @param {unknown[]} values
 * @returns {DocumentFragment}
 */
function textNodes(raw, values) {
  const result = document.createDocumentFragment();
  let end = 0;
  for (const match of raw.matchAll(SLOT)) {
    if (match.index > end) result.append(document.createTextNode(raw.slice(end, match.index)));
    result.append(slot(values[Number(match[1])]));
    end = match.index + match[0].length;
  }
  if (end < raw.length) result.append(document.createTextNode(raw.slice(end)));
  return result;
}

/**
 * The nodes for one interpolated value. A signal is wired to the position it
 * sits in: the value becomes nodes now, and again in the same place whenever
 * the signal changes.
 *
 * @param {unknown} value
 * @returns {DocumentFragment}
 */
function slot(value) {
  if (!isSignal(value)) {
    const staticResult = document.createDocumentFragment();
    insertInto(staticResult, value);
    return staticResult;
  }

  const anchor = document.createTextNode("");
  const holder = document.createDocumentFragment();
  holder.append(anchor);

  /** @type {Node[]} */
  let previous = nodesOf(value.peek());
  holder.append(...previous);

  const replace = () => {
    for (const node of previous) node.remove();
    const staging = document.createDocumentFragment();
    insertInto(staging, value.peek());
    previous = [...staging.childNodes];
    const parent = anchor.parentNode;
    if (!parent) return;
    for (const node of previous) parent.insertBefore(node, anchor);
    flushPending();
  };

  value.subscribe(replace);
  return holder;
}

/**
 * @param {unknown} value
 * @returns {Node[]}
 */
function nodesOf(value) {
  const staging = document.createDocumentFragment();
  insertInto(staging, value);
  return [...staging.childNodes];
}

/**
 * Wires up one attribute of a parsed element.
 *
 * @param {Element} element
 * @param {string} written name as it appears in the DOM, prefix included
 * @param {string} raw value as it appears in the DOM
 * @param {unknown[]} values
 * @returns {void}
 */
function bindAttribute(element, written, raw, values) {
  const { name, kind, parts } = parseAttribute(written, raw);
  if (kind === "ref") {
    for (const part of parts) {
      if (part.slot === undefined) continue;
      const sig = values[part.slot];
      if (sig && typeof sig.set === "function") sig.set(element);
    }
    element.removeAttribute(written);
    return;
  }
  element.removeAttribute(written);
  if (kind === "attribute" && !parts.some((part) => part.slot !== undefined)) {
    element.setAttribute(name, raw);
    return;
  }
  if (kind === "event") {
    for (const part of parts) {
      if (part.slot === undefined) continue;
      const handler = values[part.slot];
      if (typeof handler === "function") element.addEventListener(name, handler);
    }
    return;
  }
  if (kind === "property") {
    bindProperty(element, name, parts, values);
    return;
  }
  bindText(parts, values, (text) => element.setAttribute(name, text));
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {Part[]} parts
 * @param {unknown[]} values
 * @returns {void}
 */
function bindProperty(element, name, parts, values) {
  const only = parts.length === 1 ? parts[0] : undefined;
  if (only && only.slot !== undefined) {
    const value = values[only.slot];
    if (isSignal(value)) {
      const write = () => {
        element[name] = value.peek();
      };
      value.subscribe(write);
      write();
      return;
    }
    element[name] = value;
    return;
  }
  bindText(parts, values, (text) => {
    element[name] = text;
  });
}

/**
 * Writes the text of an attribute or property, now and on every change of
 * any signal in it.
 *
 * @param {Part[]} parts
 * @param {unknown[]} values
 * @param {(text: string) => void} write
 * @returns {void}
 */
function bindText(parts, values, write) {
  const text = () =>
    parts
      .map((part) => {
        if (part.slot === undefined) return part.text;
        const value = values[part.slot];
        return String(isSignal(value) ? value.peek() : value);
      })
      .join("");

  for (const part of parts) {
    if (part.slot === undefined) continue;
    const value = values[part.slot];
    if (isSignal(value)) value.subscribe(() => write(text()));
  }
  write(text());
}
