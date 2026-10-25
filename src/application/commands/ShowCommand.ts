import { CommandArguments } from "../CommandArguments.js";
import { EditorSession } from "../EditorSession.js";
import type { DocumentPresenter } from "../ports/DocumentPresenter.js";
import type { Command } from "./Command.js";

export class ShowCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly presenter: DocumentPresenter) {}

  execute(values: readonly string[]): readonly string[] {
    const document = this.session.requireDocument();
    const args = new CommandArguments(values, 1, 1, "show <id>");
    const id = args.word(0);
    document.getShape(id);
    return this.presenter.show(document.clone(), id);
  }
}
