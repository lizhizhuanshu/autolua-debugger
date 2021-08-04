import { EventEmitter } from 'events';
import { sep as SEP}  from 'path';
import { window, workspace,WorkspaceFolder } from 'vscode';
import {ProjectManager,FileUpdateRecord} from './ProjectManager';
import * as fs from 'fs';
import {Transport,TransportListener} from "./transport";
import { Message, METHOD } from "./proto/debugMessage"
import "moment"
import moment = require('moment');


interface Debugger 
{
    executeFile(path:string,workspaceName:string):void
    execute(code:string):void
    stopExecute(callback:()=>void):void
}



export class DebuggerProxy extends EventEmitter implements Debugger,TransportListener
{
    private transport:Transport|undefined;
    private executeFilePath:string|undefined;
    private address:string|undefined;
    private observer:(state:string)=>void|undefined;
    

    constructor(observer:(state:string)=>void|undefined)
    {
        super();
        this.observer = observer;
    }

    private updateState(state:string,address:string|undefined)
    {
        window.showInformationMessage(state+" remote host "+address)
        this.observer(state)
    }

    public connect(address:string,port:number)
    {
        if(this.address != address || this.transport == undefined)
        {
            this.updateState("connecting",address);
            this.transport = new Transport(address,port,this);
            this.address = address;
        }
    }

    public disconnect()
    {
        this.transport?.close();
        this.transport = undefined;
    }

    private asUrlFileUpdateRecord(record:FileUpdateRecord)
    {
        if(SEP !== "\\")
        {
            return record;
        }
        let r:FileUpdateRecord = {
            version:record.version
        };
        if(record.newFile)
        {
            r.newFile =this.localToUriPath(...record.newFile);
        }
        if(record.newDirectory)
        {
            r.newDirectory =this.localToUriPath(...record.newDirectory );
        }
        if(record.deleteFile)
        {
            r.deleteFile =this.localToUriPath(...record.deleteFile );
        }
        if(record.deleteDirectory)
        {
            r.deleteDirectory =this.localToUriPath(...record.deleteDirectory );
        }
        return r;
    }
    

    private uriToLocalPath(path:string):string{
        if(SEP === "\\")
        {
            
            path = path.replace(/\//g,'\\');
        }
        return path;
    }

    private localToUriPath(...path:string[]):string[]{
        if(SEP === "\\")
        {
            for(let i=0;i<path.length;i++)
            {
                path[i] = path[i].replace(/\\/g,'/');
            }
           
        }
        return path;
    }

    private onOutput(text:string,filePath:string,line:number)
    {
        let column = 1;
        //console.log("on receiveOutput",str,filePath);
        if(workspace.workspaceFolders)
        {
            filePath = workspace.workspaceFolders[0].uri.fsPath+ SEP + this.uriToLocalPath(filePath);
        }
        this.emit('output',text,filePath,line,column);
    }

    private onStop(reason?:string,...arg:any[]) {
        this.emit(reason || "end",...arg);
    }

    onError(hasError:Error)
    {

    }

    onClose(hasError:boolean)
    {
        this.updateState("disconnected",this.address);
        this.transport?.close();
        this.transport = undefined;
        this.onStop();
    }

    onConnect()
    {
        this.updateState("connected",this.address);
    }



    private updateFile(name:string,version:number)
    {
        let message:Message;
        let events = ProjectManager.getInstance().getNeedUpdateEvents(version);
        if(events != undefined)
        {
            let projectManager:ProjectManager = ProjectManager.getInstance();
            events = this.asUrlFileUpdateRecord(events);
            if(events.newDirectory != undefined)
            {
                for(let i=0;i<events.newDirectory.length;i++)
                {
                    let value = events.newDirectory[i];
                    message = Message.create({name:name,path:value,method:METHOD.CREATE_DIRECTORY});
                    this.transport?.send(message);
                }
            }

            if(events.newFile != undefined)
            {
                for(let i=0;i<events.newFile.length;i++)
                {
                    let value = events.newFile[i];
                    let data = projectManager.readFile(value);
                    message = Message.create({
                        name:name,
                        path:value,
                        method:METHOD.UPDATE_FILE,
                        data:data
                    });
                    this.transport?.send(message);
                }
            }

            if(events.deleteFile != undefined)
            {
                for(let i=0;i<events.deleteFile.length;i++)
                {
                    let value = events.deleteFile[i];
                    message = Message.create({name:name,path:value,method:METHOD.DELETE_FILE});
                    this.transport?.send(message);
                }
            }

            if(events.deleteDirectory != undefined)
            {
                for(let i=0;i<events.deleteDirectory.length;i++)
                {
                    let value = events.deleteDirectory[i];
                    message = Message.create({name:name,path:value,method:METHOD.DELETE_DIRECTORY});
                    this.transport?.send(message);
                }
            }
            message = Message.create({name:name,version:events.version,method:METHOD.UPDATE_VERSION});
            this.transport?.send(message);
        }
    }

    public onGetInfo(message:Message)
    {
        if(!message.hasOwnProperty("name"))
        {
            message.name = <string>workspace.name;
            message.feature =  ProjectManager.getInstance().getProjectFeature();
            message.version = 0;
            message.method = METHOD.CREATE_PROJECT;
            this.transport?.send(message);
        }
        this.updateFile(message.name,message.version);
        message = Message.create({name:message.name,
            path:<string>this.executeFilePath,
            method:METHOD.EXECUTE_FILE
        });
        this.transport?.send(message);
    }

    private getScreenshotPath() :string|undefined
    {
        let uri = (workspace.workspaceFolders as WorkspaceFolder[])[0].uri;
        let path = workspace.getConfiguration("AutoLua.settings").get("screenshotPath");;
        if(path != undefined)
        {
            return uri.fsPath+SEP+path;
        }
        return undefined;
    }

    private onScreenshot(data:Uint8Array )
    {

        let rootPath = this.getScreenshotPath();
        if(rootPath == undefined)
        {
            window.showWarningMessage("you need set screenshot directory");
        }
        else if(fs.existsSync(rootPath))
        {
            let path = moment().format('YYYY_MM_DD_HH_mm_ss');
            fs.writeFileSync( rootPath + SEP+path+".png",data);
        }else{
            window.showWarningMessage("don't have screenshot directory "+rootPath);
        }
    }

    onReceiveMessage(message:Message)
    {
        switch (message.method) {
            case METHOD.GET_INFO:
                this.onGetInfo(message);
                break;
            case METHOD.LOG:
                this.onOutput(message.message,message.path,message.line);
                break;
            case METHOD.STOPPED:
                this.onStop();
                break;
            case METHOD.SCREENSHOT:
                this.onScreenshot(message.data);
                break;
            default:
                break;
        }
    }

    private startExecute(other: string) {
        this.executeFilePath = other;
        if(this.transport != undefined)
        {
            let message :Message = Message.create({
                method:METHOD.GET_INFO,
                name:<string>workspace.name
            });
            this.transport.send(message);
        }else{
            window.showWarningMessage("please connect remote device");
            this.onStop();
        }
    }


    executeFile(path: string): void {
        this.startExecute(workspace.asRelativePath(path));
    }

    execute(code: string): void {
        
    }

    stopExecute(): void {
        let message :Message = Message.create({
            method:METHOD.INTERRUPT,
        });
        this.transport?.send(message);
    }

    public screenShot():void
    {

        if(this.transport != undefined)
        {
            let message :Message = Message.create({
                method:METHOD.SCREENSHOT,
            });
            this.transport.send(message);
        }else{
            window.showWarningMessage("please connect remote device");
        }
    }
}