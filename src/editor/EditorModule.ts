import { ContainerModule } from "inversify";
import * as vscode from "vscode";

import { ActivateResult, ExtensionModule } from "../ExtensionModule";
import { Command } from "../constants";

import { EditorContentsCommand } from "./EditorContentsCommand";

type EditorContentsCommandHandler = (
  resource: vscode.Uri | undefined
) => Promise<void>;

export class EditorModule extends ExtensionModule {
  protected get containerModule(): ContainerModule {
    return new ContainerModule((bind) => {
      bind(EditorContentsCommand).toSelf();
    });
  }

  activate(): ActivateResult {
    const runEditorContentsDisposable = vscode.commands.registerCommand(
      Command.runEditorContents,
      this.createHandler()
    );

    const debugEditorContentsDisposable = vscode.commands.registerCommand(
      Command.debugEditorContents,
      this.createHandler(true)
    );

    return [runEditorContentsDisposable, debugEditorContentsDisposable];
  }

  private createHandler(debug = false): EditorContentsCommandHandler {
    return (file: vscode.Uri | undefined) => {
      const editorContentsCommand = this.container.resolve(
        EditorContentsCommand
      );
      return editorContentsCommand.execute(file, debug);
    };
  }
}
