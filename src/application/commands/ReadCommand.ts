import { CommandArguments } from "../CommandArguments.js";
import { CommandError } from "../CommandError.js";
import { EditorSession } from "../EditorSession.js";
import { HistoryManager } from "../HistoryManager.js";
import type { DocumentRepository } from "../ports/DocumentRepository.js";
import type { Command } from "./Command.js";

export class ReadCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly history: HistoryManager, private readonly repository: DocumentRepository) {}

  async execute(values: readonly string[]): Promise<readonly string[]> {
    const args = new CommandArguments(values, 1, 1, "read <file.svg>");
    const path = args.word(0);
    if (path.length === 0) throw new CommandError("usage: read <file.svg>");
    const loaded = await this.repository.load(path);
    this.session.openDocument(loaded.document, path);
    this.history.resetAfterIo();
    return [...loaded.warnings, `read ${path} (${loaded.document.size} elements)`];
  }
}
