import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

export class TestWorkspace {
  private constructor(private readonly base: string, private readonly root: string) {}

  static async create(): Promise<TestWorkspace> {
    const project = await realpath(process.cwd());
    const requested = resolve(project, "tests/.tmp");
    await mkdir(requested, { recursive: true });
    const base = await realpath(requested);
    if (!base.startsWith(project + sep)) throw new Error("test directory is outside the project");
    return new TestWorkspace(base, await mkdtemp(join(base, "svg-")));
  }

  get directory(): string { return this.root; }

  file(name: string): string {
    const target = resolve(this.root, name);
    if (!target.startsWith(this.root + sep)) throw new Error("test file is outside its workspace");
    return target;
  }

  async write(name: string, content: string | Uint8Array): Promise<string> {
    const target = this.file(name);
    await writeFile(target, content);
    return target;
  }

  async cleanup(): Promise<void> {
    const target = await realpath(this.root);
    if (!target.startsWith(this.base + sep)) throw new Error("refusing to remove a directory outside the test workspace");
    await rm(target, { recursive: true, force: true });
  }
}
