import { EventEmitter } from 'events';

import { sep as SEP}  from 'path';
import { workspace } from 'vscode';
import {ProjectManager,FileUpdateRecord} from './ProjectManager';

import {Transport,TransportListener} from "./transport";
import { Message, METHOD } from "./proto/debugMessage"





interface Debugger 
{
    executeFile(ip:string,port:number, path:string,workspaceName:string):void
    execute(ip:string,port:number,code:string):void
    stopExecute(callback:()=>void):void
}


export class DebuggerProxy extends EventEmitter implements Debugger,TransportListener
{
    private transport:Transport|undefined;
    private executeFilePath:string|undefined;
    constructor()
    {
        super(); 
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
        //console.log("debugger stop",reason);
        this.transport?.close();
        this.emit(reason || "end",...arg);
    }

    onError(hasError:Error)
    {
        this.onOutput("与调试器断开连接","",0);
        this.onStop();
    }

    onConnect()
    {
        this.onOutput("已经连接到调试器","",0);
        let message :Message = Message.create({
            method:METHOD.GET_INFO,
            name:<string>workspace.name
        });
        this.transport?.send(message);
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
            default:
                break;
        }
    }

    private startExecute(ip:string,port:number, other: string) {
        this.executeFilePath = other;
        this.onOutput("正在尝试连接调试器......","",0);
        this.transport = new Transport(ip,port,this);
    }


    executeFile(ip:string,port:number,path: string): void {
        this.startExecute(ip,port,workspace.asRelativePath(path));
    }

    execute(ip:string,port:number,code: string): void {
        
    }

    stopExecute(): void {
        let message :Message = Message.create({
            method:METHOD.INTERRUPT,
        });
        this.transport?.send(message);
    }

}