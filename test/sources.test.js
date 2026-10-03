import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * The browser loads these files directly, so nothing ever type checks or
 * bundles them. This is the cheapest thing that can catch a file that would
 * not even parse: it walks the tree and asks node to parse each file.
 */

const ROOT = new URL("..", import.meta.url).pathname;
const DIRECTORIES = ["js", "test"];

/**
 * @param {string} directory
 * @returns {string[]}
 */
function sources(directory) {
  const base = join(ROOT, directory);
  return readdirSync(base, { recursive: true })
    .filter((entry) => entry.endsWith(".js"))
    .map((entry) => join(base, entry))
    .filter((path) => statSync(path).isFile());
}

describe("every source file parses", () => {
  for (const directory of DIRECTORIES) {
    for (const path of sources(directory)) {
      it(path.slice(ROOT.length), () => {
        execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
      });
    }
  }
});
