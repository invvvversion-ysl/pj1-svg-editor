import { CommandArguments } from "../CommandArguments.js";
import { CommandError } from "../CommandError.js";
import { EditorSession } from "../EditorSession.js";
import { HistoryManager } from "../HistoryManager.js";
import type { DocumentRepository } from "../ports/DocumentRepository.js";
import type { Command } from "./Command.js";

export class SaveCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly history: HistoryManager, private readonly repository: DocumentRepository) {}

  async execute(values: readonly string[]): Promise<readonly string[]> {
    const document = this.session.requireDocument();
    new CommandArguments(values, 0, 1, "save [file.svg]");
    const path = values[0] ?? this.session.filePath;
    if (path === undefined) throw new CommandError("no save path. use 'save <file.svg>' first");
    if (path.length === 0) throw new CommandError("usage: save [file.svg]");
    await this.repository.save(path, document.clone());
    this.session.markSaved(path);
    this.history.resetAfterIo();
    return [`saved to ${path} (${document.size} elements)`];
  }
}
