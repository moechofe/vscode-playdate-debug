import { inject, injectable } from "inversify";
import * as vscode from "vscode";

import {
  ConfigurationResolver,
  TaskExecution,
  TaskExecutionFactory,
  TaskRunnerTerminal,
} from "../core";

import { PDCTaskRunner } from "./PDCTaskRunner";

/**
 * The PDCExecutionFactory is responsible for configuring the VS Code
 * pseudoterminal that executes the `pdc` task.
 */
@injectable()
export class PDCExecutionFactory implements TaskExecutionFactory {
  constructor(
    @inject(ConfigurationResolver)
    private config: ConfigurationResolver
  ) {}

  async createExecution(
    definition: vscode.TaskDefinition,
    scope: vscode.WorkspaceFolder | vscode.TaskScope
  ): Promise<TaskExecution | undefined> {
    const config = await this.config.resolve(scope);
    if (!config) {
      return undefined;
    }

    const {
      workspaceRoot,
      sdkPath: sdkPathConfig,
      sourcePath: sourcePathConfig,
      gamePath: gamePathConfig,
      sdkVersion,
    } = config;

    const {
      strip,
      noCompress,
      verbose,
      quiet,
      skipUnknown,
      libPath,
      sdkPath: sdkPathDef,
      sourcePath: sourcePathDef,
      gamePath: gamePathDef,
      incrementBuildNumber,
    } = definition;

    const sdkPath = sdkPathDef ?? sdkPathConfig;
    const sourcePath = sourcePathDef ?? sourcePathConfig;
    const gamePath = gamePathDef ?? gamePathConfig;

    const execution = new vscode.CustomExecution(async () => {
      const runner = new PDCTaskRunner({
        workspaceRoot,
        sdkPath,
        sourcePath,
        gamePath,
        strip,
        noCompress,
        verbose,
        quiet,
        skipUnknown,
        libPath,
        incrementBuildNumber,
        sdkVersion,
      });
      return new TaskRunnerTerminal(runner);
    });
    return execution;
  }
}
