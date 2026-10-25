import { SvgDocument } from "../domain/SvgDocument.js";
import { CommandError } from "./CommandError.js";

export class EditorSession {
  private document: SvgDocument | undefined;
  private path: string | undefined;

  get filePath(): string | undefined { return this.path; }

  requireDocument(): SvgDocument {
    if (this.document === undefined) {
      throw new CommandError("no document. use 'init' or 'read' first");
    }
    return this.document;
  }

  openDocument(document: SvgDocument, path?: string): void {
    const owned = document.clone();
    this.document = owned;
    this.path = path;
  }

  replaceEditedDocument(document: SvgDocument): void {
    this.requireDocument();
    this.document = document.clone();
  }

  /** Called only after a future save adapter has successfully written the file. */
  markSaved(path: string): void {
    this.requireDocument();
    if (path.length === 0) throw new CommandError("save path must not be empty");
    this.path = path;
  }
}
