import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = process.argv[2];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".js")) out.push(full);
  }
  return out;
}

let problems = 0;

for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  const names = new Set();
  for (const match of text.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/gm)) {
    names.add(match[1]);
  }
  for (const match of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of match[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }

  for (const match of text.matchAll(/import\s+([^;]*?)\s+from\s+"([^"]+)"/g)) {
    const clause = match[1];
    const specifier = match[2];
    const target = resolve(dirname(file), specifier);
    if (!existsSync(target)) {
      console.log(`MISSING FILE ${file.replace(root, ".")} -> ${specifier}`);
      problems++;
      continue;
    }
    const braces = clause.match(/\{([^}]*)\}/);
    if (!braces) continue;
    const targetText = readFileSync(target, "utf8");
    for (const part of braces[1].split(",")) {
      const imported = part.trim().split(/\s+as\s+/)[0];
      if (!imported) continue;
      const pattern = new RegExp(
        `^export\\s+(?:async\\s+)?(?:function|class|const|let|var)\\s+${imported}\\b|^export\\s*\\{[^}]*\\b${imported}\\b`,
        "m",
      );
      if (!pattern.test(targetText)) {
        console.log(`MISSING EXPORT ${imported} in ${specifier} (imported by ${file.replace(root, ".")})`);
        problems++;
      }
    }
  }
}

console.log(problems === 0 ? "all imports resolve" : `${problems} problem(s)`);