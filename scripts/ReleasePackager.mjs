import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

class ReleasePackager {
  #root = resolve(fileURLToPath(new URL("../", import.meta.url)));

  async run() {
    if (resolve(this.#git(["rev-parse", "--show-toplevel"]).trim()) !== this.#root) throw new Error("Run the packager from the original project repository");
    if (this.#git(["status", "--porcelain=v1", "--untracked-files=all"]).trim()) throw new Error("Commit project changes before packaging");
    const commit = this.#git(["rev-parse", "HEAD"]).trim();
    if (this.#git(["rev-parse", "final^{commit}"]).trim() !== commit) throw new Error("The final tag must point to HEAD");
    const output = resolve(this.#root, "release");
    if (!output.startsWith(this.#root + sep)) throw new Error("Release directory must stay within the project");
    await mkdir(output, { recursive: true });
    const zip = resolve(output, "pj1-svg-editor-final.zip");
    const bundle = resolve(output, "pj1-svg-editor-history.bundle");
    this.#git(["archive", "--format=zip", "--prefix=svg-editor/", `--output=${zip}`, "final"]);
    this.#git(["bundle", "create", bundle, "--all"]);
    this.#git(["bundle", "verify", bundle]);
    const artifacts = [];
    for (const path of [zip, bundle]) {
      const bytes = await readFile(path);
      artifacts.push({ file: path.slice(output.length + 1), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
    await writeFile(resolve(output, "SHA256SUMS.txt"), artifacts.map(item => `${item.sha256}  ${item.file}`).join("\n") + "\n", "utf8");
    await writeFile(resolve(output, "manifest.json"), JSON.stringify({
      tag: "final", commit, createdAt: new Date().toISOString(), artifacts,
      note: "Source ZIP has one svg-editor folder. The bundle preserves Git history. Remote publication is verified separately.",
    }, null, 2) + "\n", "utf8");
    console.log(`Packaged final ${commit}\n${zip}\n${bundle}\nSHA256SUMS.txt and manifest.json written.`);
  }

  #git(args) {
    const result = spawnSync("git", args, { cwd: this.#root, encoding: "utf8" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `git ${args[0]} failed`);
    return result.stdout;
  }
}

await new ReleasePackager().run();
