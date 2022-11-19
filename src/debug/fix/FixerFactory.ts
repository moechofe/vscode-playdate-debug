import { injectable } from "inversify";

import { FixBreakpointVerified } from "./FixBreakpointVerified";
import { FixLaunchResponse } from "./FixLaunchResponse";
import { FixRestartResponse } from "./FixRestartResponse";
import { FixSupportsRestartRequest } from "./FixSupportsRestartRequest";
import { FixSupportsTerminateRequest } from "./FixSupportsTerminateRequest";
import { FixVariablesReference } from "./FixVariablesReference";
import { Fixer } from "./Fixer";

@injectable()
export class FixerFactory {
  async buildFixer(disableWorkarounds: boolean): Promise<Fixer> {
    const enabledFixes = disableWorkarounds
      ? []
      : [
          new FixLaunchResponse(),
          new FixRestartResponse(),
          new FixSupportsRestartRequest(),
          new FixSupportsTerminateRequest(),
          new FixVariablesReference(),
          new FixBreakpointVerified(),
        ];
    const fixer = new Fixer(enabledFixes);
    return Promise.resolve(fixer);
  }
}