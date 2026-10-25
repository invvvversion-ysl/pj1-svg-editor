import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class UngroupCommand extends EditCommand {
  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 1, 1, "ungroup <gid>");
    const id = args.word(0);
    document.ungroup(id);
    return [`g#${id} ungrouped`];
  }
}
