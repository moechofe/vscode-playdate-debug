import * as vscode from "vscode";

import { ConfigurationResolver } from "./ConfigurationResolver";
import { SimulatorTaskRunner } from "./SimulatorTaskRunner";
import { TaskRunnerTerminal } from "./TaskRunnerTerminal";

export class SimulatorExecutionFactory {
  constructor(private config: ConfigurationResolver) {}

  createExecution(definition: vscode.TaskDefinition): vscode.CustomExecution {
    const { timeout } = definition;
    return new vscode.CustomExecution(async (_task) => {
      const runner = new SimulatorTaskRunner(this.config, { timeout });
      return new TaskRunnerTerminal(runner);
    });
  }
}
