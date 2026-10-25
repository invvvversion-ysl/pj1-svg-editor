import { readdir, readFile, access } from "node:fs/promises";
import { dirname, basename, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Lightweight checks for this project's static imports, paired with the documented manual review. */
class ArchitectureAudit {
  #root = resolve(fileURLToPath(new URL("../src/", import.meta.url)));
  #errors = [];
  #allowed = new Map([
    ["domain", ["domain/"]],
    ["application", ["application/", "domain/"]],
    ["cli", ["cli/", "application/"]],
    ["presentation", ["presentation/", "domain/", "application/ports/"]],
    ["infrastructure", ["infrastructure/", "domain/", "application/ports/"]],
  ]);

  async run() {
    const files = await this.#files(this.#root);
    for (const file of files) await this.#check(file);
    if (this.#errors.length > 0) throw new Error(this.#errors.join("\n"));
    console.log(`Architecture audit passed: ${files.length} production files; class filenames, static import rules and type dispatch scan.`);
    console.log("Named dispatch points: cli/CommandRegistry.ts and domain/ShapeFactory.ts. See doc/README.md for manual review and refactor boundaries.");
  }

  async #files(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) files.push(...await this.#files(path));
      else if (entry.name.endsWith(".ts")) files.push(path);
    }
    return files.sort();
  }

  async #check(file) {
    const name = relative(this.#root, file).replaceAll("\\", "/");
    const source = await readFile(file, "utf8");
    const classes = [...source.matchAll(/^\s*export\s+(?:abstract\s+)?class\s+(\w+)/gmu)].map(match => match[1]);
    if (classes.length > 1 || classes.some(value => value !== basename(file, ".ts"))) this.#errors.push(`${name}: one class per matching filename required`);
    if (/\bswitch\s*\(|\.type\s*[!=]==|\b(?:import|require)\s*\(/u.test(source)) this.#errors.push(`${name}: type dispatch or dynamic imports require manual review`);
    const module = name.split("/")[0];
    const composition = name === "main.ts" || name === "EditorApplication.ts";
    if (!composition && !this.#allowed.has(module)) this.#errors.push(`${name}: unplanned module`);
    for (const match of source.matchAll(/^\s*import(?:\s+type)?(?:[\s\S]*?\s+from)?\s*["']([^"']+)["']/gmu)) {
      const specifier = match[1];
      if (specifier.startsWith(".")) {
        const target = resolve(dirname(file), specifier.replace(/\.js$/u, ".ts"));
        const targetName = relative(this.#root, target).replaceAll("\\", "/");
        if (targetName.startsWith("../")) this.#errors.push(`${name}: import leaves src`);
        else if (!composition && !(this.#allowed.get(module) ?? []).some(prefix => targetName.startsWith(prefix))) this.#errors.push(`${name}: forbidden dependency on ${targetName}`);
        try { await access(target); } catch { this.#errors.push(`${name}: missing import ${specifier}`); }
      } else {
        const terminalApi = module === "cli" && ["node:readline", "node:process"].includes(specifier);
        const infrastructureApi = module === "infrastructure" && (specifier.startsWith("node:") || specifier === "@xmldom/xmldom");
        if (!composition && !terminalApi && !infrastructureApi) this.#errors.push(`${name}: forbidden external dependency ${specifier}`);
      }
    }
  }
}

await new ArchitectureAudit().run();
