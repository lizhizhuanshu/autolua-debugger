// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as Net from 'net';
import {DebugAdapter} from './debugSession';
import {ProjectManager} from './ProjectManager';
import { workerData } from 'worker_threads';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "AutoLuaDebugger" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('AutoLuaDebugger.clearVersionRecord', config => {
		ProjectManager.instance?.clearVersionRecord();
	}));
	ProjectManager.initialize(context);
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory("AutoLuaDebugger", new DebugAdapterServerDescriptorFactory()));
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log("deactivete AutoLuaDebugger");
}


class DebugAdapterServerDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {

	private server?: Net.Server;

	createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new DebugAdapter();
				session.setRunAsServer(true);
				session.start(socket as NodeJS.ReadableStream, socket);
			}).listen(0);
		}
		// make VS Code connect to debug server
		return new vscode.DebugAdapterServer((this.server.address() as Net.AddressInfo).port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}