import { EventEmitter } from 'events';

import { sep as SEP}  from 'path';
import { workspace } from 'vscode';
import {ProjectManager,FileUpdateRecord} from './ProjectManager';
import {Message,ProjectInfo,MESSAGE_TYPE} from './gen-nodejs/DebugService_types';
import {Client} from './gen-nodejs/DebuggerService'
import Int64 = require('node-int64');
import * as thrift from "thrift";
import { unwatchFile } from 'node:fs';
const assert = require('assert');

var transport = thrift.TFramedTransport;
var protocol = thrift.TBinaryProtocol;


interface Debugger 
{
    executeFile(ip:string,port:number, path:string,workspaceName:string):void
    execute(ip:string,port:number,code:string):void
    stopExecute():void
}


export class DebuggerProxy extends EventEmitter implements Debugger
{
    debuggerService:Client|undefined;
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
        this.emit(reason || "end",...arg);
        //console.log("debugger stop",reason);
    }

    private startReceiveMessage(debuggerService:Client)
    {
        let proxy = this;
        let method :(error:void, data:Message)=>void;
        method = function(error:void,data:Message)
        {
            if(data.type == MESSAGE_TYPE.LOG)
            {
                proxy.onOutput(data.message,data.path,data.line);
                debuggerService.getMessage(method);
            }else if(data.type == MESSAGE_TYPE.STOP)
            {
                proxy.onStop();
            }else if(data.type == MESSAGE_TYPE.ERROR)
            {
                proxy.onOutput(data.message,data.path,data.line);
                proxy.onStop();
            }
        }
        debuggerService.getMessage(method);
    }



    private async onCheckProjectFile(debuggerService:Client, projectInfo :ProjectInfo)
    {
        if(projectInfo.feature == null 
            && projectInfo.name == null
            && projectInfo.version.equals(new Int64(0)))
        {
            await debuggerService.createProject(<string>workspace.name,
                ProjectManager.getInstance().getProjectFeature(),
                new Int64(0))
        }

        let projectName =<string>workspace.name;
        let events = ProjectManager.getInstance().getNeedUpdateEvents(projectInfo.version.toNumber());
        if(events != undefined)
        {
            let projectManager:ProjectManager = ProjectManager.getInstance();
            events = this.asUrlFileUpdateRecord(events);
            if(events.newDirectory != undefined)
            {
                for(let i=0;i<events.newDirectory.length;i++)
                {
                    let value = events.newDirectory[i];
                    await debuggerService.createDirectory(projectName,value);
                }
            }

            if(events.newFile != undefined)
            {
                for(let i=0;i<events.newFile.length;i++)
                {
                    let value = events.newFile[i];
                    await debuggerService.updateFile(projectName,value,projectManager.readFile(value));
                }
            }

            if(events.deleteFile != undefined)
            {
                for(let i=0;i<events.deleteFile.length;i++)
                {
                    let value = events.deleteFile[i];
                    await debuggerService.deleteFile(projectName,value);
                }
            }

            if(events.deleteDirectory != undefined)
            {
                for(let i=0;i<events.deleteDirectory.length;i++)
                {
                    let value = events.deleteDirectory[i];
                    await debuggerService.deleteDirectory(projectName,value);
                }
            }
            await debuggerService.updateVersion(projectName,new Int64(events.version));
        }
    }

    private checkProjectInfo(callback:(info:ProjectInfo)=>void)
    {
        this.debuggerService?.getInfo(<string>workspace.name).then((info:ProjectInfo)=>{
            if(info.feature == null 
                && info.name == null
                && info.version.equals(new Int64(0)))
            {
                info.feature = ProjectManager.getInstance().getProjectFeature();
                info.name = <string>workspace.name;
                info.version = new Int64(0);
                this.debuggerService?.createProject(info.name,info.feature,info.version).then(()=>{
                    callback(info);
                })
            }else{
                callback(info);
            }
        })
    }

    private startExecute(ip:string,port:number, other: string) {
        let connection = thrift.createConnection(ip, port, {
            transport : transport,
            protocol : protocol
        });
        let proxy:DebuggerProxy = this;
        connection.on('error', function(err:any) {
            proxy.onStop();
        });
        let projectName =<string>workspace.name;
        let debuggerService:Client = thrift.createClient(Client, connection);
        this.debuggerService = debuggerService;
        this.checkProjectInfo((info:ProjectInfo)=>{
            proxy.onCheckProjectFile(debuggerService,info).then(()=>{
                debuggerService.executeFile(projectName,other).then();
                let method = (data:Message)=>{
                    if(data.type == MESSAGE_TYPE.LOG)
                    {
                        proxy.onOutput(data.message,data.path,data.line);
                        debuggerService.getMessage().then(method);
                    }else if(data.type == MESSAGE_TYPE.STOP)
                    {
                        proxy.onStop();
                    }else if(data.type == MESSAGE_TYPE.ERROR)
                    {
                        proxy.onOutput(data.message,data.path,data.line);
                        proxy.onStop();
                    }
                };
                debuggerService.getMessage().then(method);
            });
        });
    }


    executeFile(ip:string,port:number,path: string): void {
        this.startExecute(ip,port,workspace.asRelativePath(path));
    }

    execute(ip:string,port:number,code: string): void {
        
    }

    stopExecute(): void {
        this.debuggerService?.interrupt(function(){
            
        })
    }

}