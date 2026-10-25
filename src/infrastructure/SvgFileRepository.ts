import { randomUUID } from "node:crypto";
import { open, readFile, rename, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { DocumentRepository } from "../application/ports/DocumentRepository.js";
import type { LoadedDocument } from "../application/ports/LoadedDocument.js";
import { DomainError } from "../domain/DomainError.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { SvgCodec } from "./SvgCodec.js";

export class SvgFileRepository implements DocumentRepository {
  constructor(private readonly codec = new SvgCodec()) {}

  async load(path: string): Promise<LoadedDocument> {
    let bytes: Buffer;
    try { bytes = await readFile(path); }
    catch { throw new DomainError(`cannot read file: ${path}`); }
    let source: string;
    try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { throw new DomainError("invalid SVG encoding: expected UTF-8"); }
    return this.codec.decode(source);
  }

  async save(path: string, document: SvgDocument): Promise<void> {
    // Finish validation/serialization before touching the destination or creating a temp file.
    const content = this.codec.encode(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    let handle: FileHandle | undefined;
    let created = false;
    try {
      handle = await open(temporary, "wx");
      created = true;
      await handle.writeFile(content, "utf8");
      await handle.close();
      handle = undefined;
      await rename(temporary, path);
    } catch {
      throw new DomainError(`cannot write file: ${path}`);
    } finally {
      await handle?.close().catch(() => undefined);
      if (created) await unlink(temporary).catch(() => undefined);
    }
  }
}
