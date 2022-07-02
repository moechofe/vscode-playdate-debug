import * as net from "net";

import { Fixer, isClientFix, isServerFix } from "./Fixer";
import { OnProxyClient } from "./OnProxyClient";
import { OnProxyServer } from "./OnProxyServer";
import { SIMULATOR_DEBUG_PORT } from "./constants";
import { waitForDebugPort } from "./waitForDebugPort";

/**
 * ProxyServer is used to improve the experience of debugging Playdate games
 * in VS Code. It works around some issues caused by bugs in the Playdate
 * Simulator debug adapter protocol server and limitations in VS Code.
 *
 * See https://microsoft.github.io/debug-adapter-protocol/ for details about
 * the Debug Adapter Protocol.
 */
export class ProxyServer {
  private clientSocket!: net.Socket;
  private simulatorSocket!: net.Socket;
  private simulatorSeq!: number;
  private simulatorSeqOffset = 0;

  private clientFixes: OnProxyClient[] = [];
  private serverFixes: OnProxyServer[] = [];

  private constructor(fixers: Fixer[]) {
    for (const fixer of fixers) {
      if (isClientFix(fixer)) {
        this.clientFixes.push(fixer);
      }

      if (isServerFix(fixer)) {
        this.serverFixes.push(fixer);
      }
    }
  }

  /**
   * Connect to the Playdate Simulator debugger and then start the proxy server.
   *
   * @returns The proxy socket server instance. Calling code must call `listen`
   * on the socket server to accept incoming connections from VS Code.
   */
  static async start(fixers: Fixer[] = []): Promise<net.Server> {
    const proxy = new ProxyServer(fixers);
    await proxy.connect();

    return net.createServer((socket) => {
      if (proxy.clientSocket) {
        return;
      }

      proxy.clientSocket = socket;
      proxy.clientSocket.on("data", (data) => proxy.proxyClientData(data));
    });
  }

  private async connect(): Promise<void> {
    // The Playdate Simulator's debug adapter protocol server takes ~250ms to
    // respond on the debug port after launching the app. waitForDebugPort will
    // attempt to continuously connect to the Playdate Simulator up to a certain
    // number of times with a short timeout. We return the connected socket
    // because closing it immediately after a successful connection can cause
    // the Playdate Simulator to become unresponsive to new connections.
    const socket = await waitForDebugPort(SIMULATOR_DEBUG_PORT);
    if (!socket) {
      throw new Error(`Could not connect to Playdate Simulator`);
    }

    this.simulatorSocket = socket;
    this.simulatorSocket.on("data", (data) => this.proxySimulatorData(data));
    this.simulatorSocket.on("close", () => this.clientSocket?.end());
  }

  private proxyClientData(dataIn: Buffer): void {
    const message = decodeMessage(dataIn);

    for (const fixer of this.clientFixes) {
      const response = fixer.onProxyClient(message);
      if (response === null) {
        continue;
      }

      const dataOut = encodeMessage(response);
      this.clientSocket?.write(dataOut);
    }

    const dataOut = encodeMessage(message);
    this.simulatorSocket?.write(dataOut);
  }

  private proxySimulatorData(dataIn: Buffer): void {
    const message = decodeMessage(dataIn);

    for (const fixer of this.serverFixes) {
      fixer.onProxyServer(message);
    }

    const dataOut = encodeMessage(message);
    this.clientSocket?.write(dataOut);
  }
}

// See https://microsoft.github.io/debug-adapter-protocol/overview#base-protocol
// for a description of the base protocol used to transmit Debug Adapter
// Protocol messages.

function decodeMessage(data: Buffer): any {
  const payload = data.toString();
  const components = payload.split(SEPARATOR);
  const content = components[1];
  return JSON.parse(content);
}

function encodeMessage(message: any): Buffer {
  const content = JSON.stringify(message);
  const components = [`Content-Length: ${content.length}`, content];
  const payload = components.join(SEPARATOR);
  return Buffer.from(payload);
}

const SEPARATOR = "\r\n\r\n";
