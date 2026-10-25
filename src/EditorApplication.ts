import { EditorSession } from "./application/EditorSession.js";
import { HistoryManager } from "./application/HistoryManager.js";
import { AddToCommand } from "./application/commands/AddToCommand.js";
import { BackCommand } from "./application/commands/BackCommand.js";
import { CanvasCommand } from "./application/commands/CanvasCommand.js";
import { CreateCommand } from "./application/commands/CreateCommand.js";
import { DeleteCommand } from "./application/commands/DeleteCommand.js";
import { FrontCommand } from "./application/commands/FrontCommand.js";
import { GroupCommand } from "./application/commands/GroupCommand.js";
import { HelpCommand } from "./application/commands/HelpCommand.js";
import { InitCommand } from "./application/commands/InitCommand.js";
import { MoveCommand } from "./application/commands/MoveCommand.js";
import { RedoCommand } from "./application/commands/RedoCommand.js";
import { ScaleCommand } from "./application/commands/ScaleCommand.js";
import { SetAttributeCommand } from "./application/commands/SetAttributeCommand.js";
import { UndoCommand } from "./application/commands/UndoCommand.js";
import { UngroupCommand } from "./application/commands/UngroupCommand.js";
import { CommandRegistry } from "./cli/CommandRegistry.js";
import { Repl } from "./cli/Repl.js";
import { ShapeFactory } from "./domain/ShapeFactory.js";
import type { SvgDocument } from "./domain/SvgDocument.js";
import { HelpText } from "./presentation/HelpText.js";

/** Composition root shared by the REPL, command demo and integration tests. */
export class EditorApplication {
  private readonly session = new EditorSession();
  private readonly history = new HistoryManager(this.session);
  private readonly registry = new CommandRegistry();

  constructor() {
    const factory = new ShapeFactory();
    this.registry.register("help", () => new HelpCommand(new HelpText().lines()));
    this.registry.register("init", () => new InitCommand(this.session, this.history));
    this.registry.register("canvas", () => new CanvasCommand(this.session, this.history));
    this.registry.register("create", () => new CreateCommand(this.history, factory));
    this.registry.register("delete", () => new DeleteCommand(this.history));
    this.registry.register("move", () => new MoveCommand(this.history));
    this.registry.register("scale", () => new ScaleCommand(this.history));
    this.registry.register("set", () => new SetAttributeCommand(this.history));
    this.registry.register("group", () => new GroupCommand(this.history));
    this.registry.register("ungroup", () => new UngroupCommand(this.history));
    this.registry.register("addto", () => new AddToCommand(this.history));
    this.registry.register("front", () => new FrontCommand(this.history));
    this.registry.register("back", () => new BackCommand(this.history));
    this.registry.register("undo", () => new UndoCommand(this.history));
    this.registry.register("redo", () => new RedoCommand(this.history));
  }

  execute(line: string): Promise<readonly string[]> { return this.registry.execute(line); }

  documentSnapshot(): SvgDocument { return this.session.requireDocument().clone(); }

  run(): Promise<void> { return new Repl(this.registry).run(); }
}
