import { CommandArguments } from "../CommandArguments.js";
import { EditorSession } from "../EditorSession.js";
import type { DocumentPresenter } from "../ports/DocumentPresenter.js";
import type { Command } from "./Command.js";

export class TreeCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly presenter: DocumentPresenter) {}

  execute(values: readonly string[]): readonly string[] {
    const document = this.session.requireDocument();
    new CommandArguments(values, 0, 1, "tree [id]");
    const id = values[0];
    if (id !== undefined) document.getShape(id);
    return this.presenter.tree(document.clone(), id);
  }
}
