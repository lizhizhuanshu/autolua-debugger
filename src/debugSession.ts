
import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { basename } from 'path';
import { DebuggerProxy} from './debugger';
import { Subject } from 'await-notify';
import { workspace } from 'vscode';

interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	ip: string;
	port:number;
	startFile:string;
}


export class DebugAdapter extends LoggingDebugSession
{
    private _runtime:DebuggerProxy;
    private threadID:number = 1;
    private _configurationDone = new Subject();
    public constructor() {
		super("AutoLuaDebugger.txt");
		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

		this._runtime = new DebuggerProxy();
		// setup event handlers
		this._runtime.on('stopOnEntry', () => {
			this.sendEvent(new StoppedEvent('entry', this.threadID));
		});
		this._runtime.on('stopOnStep', () => {
			this.sendEvent(new StoppedEvent('step',this.threadID));
		});
		this._runtime.on('stopOnBreakpoint', () => {
			this.sendEvent(new StoppedEvent('breakpoint',this.threadID));
		});
		this._runtime.on('stopOnDataBreakpoint', () => {
			this.sendEvent(new StoppedEvent('data breakpoint', this.threadID));
		});	
		this._runtime.on('stopOnException', (text:string) => {
			this.sendEvent(new StoppedEvent('exception', this.threadID,text));
		});

		this._runtime.on('output', (text, filePath, line, column) => {
			const e: DebugProtocol.OutputEvent = new OutputEvent(`${text}\n`);
			if (text === 'start' || text === 'startCollapsed' || text === 'end') {
				e.body.group = text;
				e.body.output = `group-${text}\n`;
			}
			//console.log(filePath,this.createSource(filePath));
			e.body.source = this.createSource(filePath);
			e.body.line = line;
			e.body.column = this.convertDebuggerColumnToClient(column);
			this.sendEvent(e);
		});
		this._runtime.on('end', () => {
			this.sendEvent(new TerminatedEvent());
		});
    }
    
     /**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = true;

		// make VS Code to show a 'step back' button
		response.body.supportsStepBack = true;

		// make VS Code to support data breakpoints
		response.body.supportsDataBreakpoints = true;

		// make VS Code to support completion in REPL
		response.body.supportsCompletionsRequest = true;
		response.body.completionTriggerCharacters = [ ".", "[" ];

		// make VS Code to send cancelRequests
		response.body.supportsCancelRequest = true;

		// make VS Code send the breakpointLocations request
		response.body.supportsBreakpointLocationsRequest = true;

		// make VS Code provide "Step in Target" functionality
		response.body.supportsStepInTargetsRequest = true;
		
		this.sendResponse(response);

		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new InitializedEvent());
	}

	/**
	 * Called at the end of the configuration sequence.
	 * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
	 */
	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);
		// notify the launchRequest that configuration has finished
		this._configurationDone.notify();
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: ILaunchRequestArguments) {
		await this._configurationDone.wait(1000);
		//console.log(args.startFile);
		this._runtime.executeFile(args.ip,args.port,args.startFile);
		this.sendResponse(response);
	}

	protected terminateRequest(response:DebugProtocol.TerminateResponse,args:DebugProtocol.TerminateArguments)
	{
		this._runtime.stopExecute();
		this.sendResponse(response);
	}


    private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mock-adapter-data');
	}

}