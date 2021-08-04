// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as Net from 'net';
import {DebugAdapter} from './debugSession';
import {ProjectManager} from './ProjectManager';
import { RemoteHost, RemoteHostProvider } from './RemoteHostProvider';
import { DebuggerProxy } from './debugger';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "AutoLuaDebugger" is now active!');
	ProjectManager.initialize(context);
	context.subscriptions.push(vscode.commands.registerCommand('AutoLua.debug.clearVersionRecord', config => {
		ProjectManager.instance?.clearVersionRecord();
	}));
	let statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
	let debuggerProxy = new DebuggerProxy((state)=>{
		if(state == "connecting")
		{
			state = "$(vm-connect)";
		}
		else if(state == "connected")
		{
			state = "$(vm-active)";
		}else {
			state = "$(vm)";
		}
		statusBar.text = "AutoLua"+state;
		statusBar.show();
	});
	context.subscriptions.push(statusBar);
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory("AutoLuaDebugger",
	 	new DebugAdapterServerDescriptorFactory(debuggerProxy)));
	let remoteHostProvider = new RemoteHostProvider();
	context.subscriptions.push(vscode.window.registerTreeDataProvider("remoteDevice",remoteHostProvider));
	context.subscriptions.push(vscode.commands.registerCommand("AutoLua.debug.updateRemoteDevice",()=>{
		remoteHostProvider.refresh();
	}))

	context.subscriptions.push(vscode.commands.registerCommand("AutoLua.debug.connectClient",(info:RemoteHost |undefined)=>{
		if(info == undefined)
		{
			let the= vscode.window.showInputBox();
			let port:string|undefined = vscode.workspace.getConfiguration("AutoLua.settings").get("port");
			the.then((value)=>{
				if(value != undefined && port != undefined)
				{
					debuggerProxy.connect(value,parseInt(port));
				}
			})
		}else{
			debuggerProxy.connect(info.getAddress(),info.getPort());
		}

	}))
	context.subscriptions.push(vscode.commands.registerCommand("AutoLua.debug.disconnectClient",()=>{
		debuggerProxy.disconnect();
	}))
	context.subscriptions.push(vscode.commands.registerCommand("AutoLua.debug.screenshot",()=>{
		debuggerProxy.screenShot();
	}))
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log("deactivete AutoLuaDebugger");
}


class DebugAdapterServerDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {

	private server?: Net.Server;
	private _runtime:DebuggerProxy;
	constructor(runtime:DebuggerProxy)
	{
		this._runtime = runtime;
	}

	createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new DebugAdapter(this._runtime);
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