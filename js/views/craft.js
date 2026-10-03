/**
 * The crafts tab: save and load antenna configurations for spacecraft.
 *
 * A craft is a named collection of antennas (type + quantity). Loading a craft
 * replaces the antenna list on the Planner. Crafts are stored in localStorage
 * and included in the full data backup on the Settings tab.
 *
 * @module
 */

import { computed, signal } from "../reactive.js";
import { each, element, html } from "../html.js";
import { number } from "../format.js";
import { textField } from "./field.js";

/** @typedef {import("../store.js").Store} Store */
/** @typedef {import("../store.js").Craft} Craft */

/**
 * A simple toast notification. The markup is built once and the element is
 * moved in and out of the document as needed.
 *
 * @returns {{show: (message: string) => void, markup: import("../html.js").Fragment}}
 */
function createToast() {
  const message = signal("");

  const markup = html`
    <div class="toast" hidden=${computed(() => !message.value)}>
      ${computed(() => message.value)}
    </div>
  `;

  const node = /** @type {HTMLElement} */ (element(markup));

  function show(text) {
    message.set(text);
    document.body.append(node);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (message.value === text) message.set("");
      node.remove();
    }, 3000);
  }

  return { show, markup };
}

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function craftView(store) {
  const toast = createToast();

  // --- Save current as craft dialog (built once) ---
  const saveDraft = signal("");
  const saveCurrentNode = createSaveCurrentDialog(store, saveDraft, toast);

  // --- Rename dialog (built once) ---
  const renameDraft = signal({ name: "", originalName: "" });
  const renameNode = createRenameDialog(store, renameDraft, toast);

  // --- Delete confirmation dialog (built once) ---
  const deleteTarget = signal("");
  const deleteNode = createDeleteDialog(store, deleteTarget, toast);

  const craftNames = computed(() => Object.keys(store.userCrafts.value).sort());

  /**
   * @param {string} name
   * @returns {void}
   */
  function loadCraft(name) {
    const ok = store.loadCraft(name);
    if (ok) {
      toast.show(`Loaded craft "${name}"`);
    } else {
      toast.show(`Craft "${name}" could not be loaded — none of its antennas are available`);
    }
  }

  function startSaveCurrent() {
    saveDraft.set("");
    document.body.append(saveCurrentNode);
    saveCurrentNode.showModal();
    // Focus the input after dialog opens
    setTimeout(() => {
      const input = saveCurrentNode.querySelector('input[type="text"]');
      if (input) input.focus();
    }, 0);
  }

  function confirmDelete(name) {
    deleteTarget.set(name);
    document.body.append(deleteNode);
    deleteNode.showModal();
  }

  function startRename(name) {
    renameDraft.set({ name, originalName: name });
    document.body.append(renameNode);
    renameNode.showModal();
    setTimeout(() => {
      const input = renameNode.querySelector('input[type="text"]');
      if (input) input.focus();
    }, 0);
  }

  return html`
    <div class="stack">
      <h2>Crafts</h2>

      <section class="card">
        <div class="card-header">
          <h3>Saved crafts</h3>
          <button type="button" @click=${startSaveCurrent}>Save current as craft</button>
        </div>
        ${computed(() =>
          craftNames.value.length === 0
            ? html`<p class="empty">
                No crafts saved yet. Configure antennas on the Planner, then save them here.
              </p>`
            : html`
                <table class="data">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th class="numeric">Antennas</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${each(
                      craftNames,
                      (name) => name,
                      (name) => {
                        const craft = computed(() => store.userCrafts.value[name]);
                        return html`
                          <tr>
                            <td>${computed(() => craft.value?.name ?? name)}</td>
                            <td class="numeric">
                              ${computed(() => craft.value?.antennas.length ?? 0)}
                            </td>
                            <td>
                              <button type="button" class="primary" @click=${() => loadCraft(name)}>
                                Load
                              </button>
                              <button type="button" @click=${() => startRename(name)}>
                                Rename
                              </button>
                              <button
                                type="button"
                                class="danger"
                                @click=${() => confirmDelete(name)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        `;
                      },
                    )}
                  </tbody>
                </table>
              `,
        )}
      </section>

      ${toast.markup}
    </div>
  `;
}

/**
 * Creates the "Save current as craft" dialog. Built once, shown/hidden as needed.
 */
function createSaveCurrentDialog(store, saveDraft, toast) {
  const markup = html`
    <dialog>
      <h3>Save current antenna list as craft</h3>
      <p class="hint">
        This saves the antenna list from the Planner
        (${computed(() => number(store.chain.value.antennas.length))}
        antenna${computed(() => (store.chain.value.antennas.length === 1 ? "" : "s"))}).
      </p>
      ${textField({
        label: "Craft name",
        follow: () => saveDraft.value ?? "",
        onInput: (value) => saveDraft.set(value),
      })}
      <div class="actions" style="margin-top: 1rem;">
        <button
          type="button"
          class="primary"
          @click=${() => {
            const name = saveDraft.peek()?.trim();
            if (name) {
              store.saveCraft(name, store.chain.value.antennas);
              toast.show(`Saved craft "${name}"`);
            }
            saveDraft.set("");
            saveCurrentNode.close();
            saveCurrentNode.remove();
          }}
          .disabled=${computed(() => !saveDraft.value?.trim())}
        >
          Save
        </button>
        <button
          type="button"
          @click=${() => {
            saveDraft.set("");
            saveCurrentNode.close();
            saveCurrentNode.remove();
          }}
        >
          Cancel
        </button>
      </div>
    </dialog>
  `;

  const saveCurrentNode = /** @type {HTMLDialogElement} */ (element(markup));
  return saveCurrentNode;
}

/**
 * Creates the "Rename craft" dialog. Built once, shown/hidden as needed.
 */
function createRenameDialog(store, renameDraft, toast) {
  const markup = html`
    <dialog>
      <h3>Rename craft</h3>
      ${textField({
        label: "Name",
        follow: () => renameDraft.value?.name ?? "",
        onInput: (value) => renameDraft.set({ ...renameDraft.value, name: value }),
      })}
      <div class="actions" style="margin-top: 1rem;">
        <button
          type="button"
          class="primary"
          @click=${() => {
            const current = renameDraft.peek();
            if (current && current.name.trim() && current.name.trim() !== current.originalName) {
              store.renameCraft(current.originalName, current.name.trim());
              toast.show(`Renamed craft to "${current.name.trim()}"`);
            }
            renameDraft.set({ name: "", originalName: "" });
            renameNode.close();
            renameNode.remove();
          }}
          .disabled=${computed(() => !renameDraft.value?.name?.trim())}
        >
          Save
        </button>
        <button
          type="button"
          @click=${() => {
            renameDraft.set({ name: "", originalName: "" });
            renameNode.close();
            renameNode.remove();
          }}
        >
          Cancel
        </button>
      </div>
    </dialog>
  `;

  const renameNode = /** @type {HTMLDialogElement} */ (element(markup));
  return renameNode;
}

/**
 * Creates the "Delete craft" confirmation dialog. Built once, shown/hidden as needed.
 */
function createDeleteDialog(store, deleteTarget, toast) {
  const markup = html`
    <dialog>
      <h3>Delete craft "${computed(() => deleteTarget.value)}"?</h3>
      <p class="hint">This cannot be undone.</p>
      <div class="actions" style="margin-top: 1rem;">
        <button
          type="button"
          class="danger"
          @click=${() => {
            store.removeCraft(deleteTarget.peek());
            toast.show(`Deleted craft "${deleteTarget.peek()}"`);
            deleteTarget.set("");
            deleteNode.close();
            deleteNode.remove();
          }}
        >
          Delete
        </button>
        <button
          type="button"
          @click=${() => {
            deleteTarget.set("");
            deleteNode.close();
            deleteNode.remove();
          }}
        >
          Cancel
        </button>
      </div>
    </dialog>
  `;

  const deleteNode = /** @type {HTMLDialogElement} */ (element(markup));
  return deleteNode;
}
