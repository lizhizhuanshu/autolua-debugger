import {workspace,ExtensionContext, FileSystemWatcher, Uri, FileType, Memento, WorkspaceFolder} from 'vscode';
import * as fs from 'fs';
import { sep as SEP}  from 'path';

import  'string-random'
import stringRandom = require('string-random');
import { glob } from 'glob';
import { Minimatch,IMinimatch } from 'minimatch';

//文件更改记录的问题需要重新设计

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum FileEventType{Change,Create,Delect};


interface FileUpdateEvent
{
    path:string;
    eventType:FileEventType;
    type:FileType;
}

export interface FileUpdateRecord{
    version:number;
    newFile?:string[];
    newDirectory?:string[];
    deleteFile?:string[];
    deleteDirectory?:string[];
}



interface FileUpdatePackage
{
    version:number;
    updateRecords:FileUpdateEvent[];
}

interface FileUpdatePackageRecorder
{
    maxSize:number;
    fileUpdatePackages:FileUpdatePackage[];
}

interface FileTypeRecord
{
    [index:string]:FileType;
}



export class ProjectManager
{
    private static readonly fileUpdatePackageRecorderKey="fileUpdatePackageRecorder";
    private static readonly fileUpdateEventsKey="fileUpdateEvents";
    private static readonly codeFeatureKey="codeFeature";
    private static readonly maxFileUpdateEventsSize = 50;
    private static readonly maxFileUpdatePackageSize = 20;

    private rootfsPath:string;
    private workspaceState:Memento;
    private fileWatch:FileSystemWatcher|undefined;
    private typeRecord:FileTypeRecord;
    private fileUpdateEvents:FileUpdateEvent[];
    private fileUpdatePackageRecorder:FileUpdatePackageRecorder;
    private lastChangePath:string|undefined;
    private codeFeature:string;
    private ignoreFileMatch:IMinimatch|undefined;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static instance:ProjectManager |undefined;

    private initializeIgnoreFileMatch()
    {
        let confiture:string[]|undefined = workspace.getConfiguration("AutoLua.settings").get("ignoreFileMatch");
        if(confiture != undefined)
        {
            
            let pattern = "{"+confiture.join(",")+"}";
            this.ignoreFileMatch = new Minimatch(pattern);
        }
    }

    private isIgnoreFileByRelativePath(path:string):boolean
    {
        if(this.ignoreFileMatch != undefined)
        {
            let result = this.ignoreFileMatch.match(path);
            return result;
        }
        return false;
    }

    private isIgnoreFile(path:string):boolean
    {
        return this.isIgnoreFileByRelativePath(workspace.asRelativePath(path));
    }

    private constructor(context:ExtensionContext)
    {
        this.workspaceState = context.workspaceState;
        this.typeRecord =  {};
        this.fileUpdateEvents =  this.workspaceState.get(ProjectManager.fileUpdateEventsKey) ||[];
        this.fileUpdatePackageRecorder = this.workspaceState.get(ProjectManager.fileUpdatePackageRecorderKey)||{
            'maxSize':5,
            'fileUpdatePackages':[]
        };

        let codeFeature:string|undefined = this.workspaceState.get<string>(ProjectManager.codeFeatureKey);
        if(codeFeature == undefined)
        {
            codeFeature = stringRandom(66,true);
            this.workspaceState.update(ProjectManager.codeFeatureKey,codeFeature);
        }
        this.codeFeature = codeFeature;
        let uri = (workspace.workspaceFolders as WorkspaceFolder[])[0].uri;
        this.rootfsPath = uri.fsPath;
        this.initializeFileTypeRecord();
        this.initializeIgnoreFileMatch()
        workspace.onDidChangeConfiguration(()=>{
            this.initializeIgnoreFileMatch()
        })
        let pattern = "/**";
        this.fileWatch= workspace.createFileSystemWatcher(uri.path.substr(1)+pattern,false,false,false);
        this.fileWatch.onDidChange(uri=>{
            let nowPath = workspace.asRelativePath(uri.path);
            if(this.lastChangePath && this.lastChangePath === nowPath)
            {
                return ;
            }
            this.lastChangePath = nowPath;
            this.pushFileUpdateEvent(uri,FileEventType.Change);
        });
        this.fileWatch.onDidCreate(uri=>{
            this.pushFileUpdateEvent(uri,FileEventType.Create);
        });
        this.fileWatch.onDidDelete(uri=>{
            this.pushFileUpdateEvent(uri,FileEventType.Delect);
        });
    }

    private initializeFileTypeRecord(file?:string) {
        file = file || "";
        let files = fs.readdirSync(this.rootfsPath+SEP+file);
        files.forEach((fileName,index)=>{
            //console.log(fileName);
            let path = file ==="" ? fileName : file + SEP + fileName;
            let state = fs.statSync(this.rootfsPath+SEP +path);

            if(state.isDirectory()){
                this.typeRecord[path] = FileType.Directory;
                this.initializeFileTypeRecord(path);
            }else{
                this.typeRecord[path] = FileType.File;
            }
        });
    }


    /**
     * clearVersionRecord
     */
    public clearVersionRecord() {
        this.typeRecord =  {};
        this.fileUpdateEvents = [];
        this.fileUpdatePackageRecorder = {
            'maxSize':5,
            'fileUpdatePackages':[]
        };
        this.workspaceState.update(ProjectManager.fileUpdateEventsKey,this.fileUpdateEvents);
        this.workspaceState.update(ProjectManager.fileUpdatePackageRecorderKey,this.fileUpdatePackageRecorder);
        
    }

    public getProjectFeature()
    {
        return this.codeFeature;
    }


    private isInDirectory(father:FileUpdateEvent,son:FileUpdateEvent)
    {
        return father.type === FileType.Directory
        &&son.path.startsWith(father.path)
        && son.path.charAt(father.path.length) === SEP ;
    }

    private isSameFile(one:FileUpdateEvent,two:FileUpdateEvent)
    {
        return one.type === two.type
        &&  one.path === two.path;
    }

    private deleteRepetitiveEvent(events:FileUpdateEvent[],index:number,event:FileUpdateEvent)
    {
        if(!event)
        {
            return ;
        }

        for(let i=index;i>=0;i--)
        {
            if(events[i] 
                && (this.isSameFile(event,events[i])
                || this.isInDirectory(event,events[i])))
            {
                delete events[i];
            }
        }
    }

    private deleteRepetitiveDirectory(events:FileUpdateEvent[],index:number,event:FileUpdateEvent) {
        if(!event || 
            event.type !== FileType.Directory ||
            event.eventType !== FileEventType.Create)
        {
            return ;
        }
        for(let i=index;i<events.length;i++)
        {
            if(events[i] && this.isInDirectory(event,events[i]))
            {
                delete events[i];
            }
        }

    }


    private packageFileUpdateEvents(events:FileUpdateEvent[]):FileUpdateEvent[]
    {
        let r:FileUpdateEvent[]=[];
        for(let i=events.length-1;i>0;i--)
        {
            this.deleteRepetitiveEvent(events,i-1,events[i]);
        }
        for(let i=0;i<events.length-1;i++)
        {
            this.deleteRepetitiveDirectory(events,i+1,events[i]);
        }

        for(let i=0;i<events.length;i++)
        {
            if(events[i])
            {
                r.push(events[i]);
            }
        }
        return r;
    }

    private joinFileUpdatePackages(fileUpdatePackages:FileUpdatePackage[],origin:number,len:number):FileUpdatePackage
    {
        if(len ===0)
        {
            return {
                'version' : fileUpdatePackages[origin].version,
                'updateRecords':[...(fileUpdatePackages[origin].updateRecords)]
            };
        }

        let r:FileUpdatePackage={
            'version' : fileUpdatePackages[origin+len-1].version,
            'updateRecords':[],
        };
        for(let i=0;i<len;i++)
        {
            r.updateRecords.push(...(fileUpdatePackages[origin+i].updateRecords));
        }
        r.updateRecords = this.packageFileUpdateEvents(r.updateRecords);
        return r;
    }

    private saveJoinFileUpdatePackages(origin:number,len:number)
    {
        let record = this.fileUpdatePackageRecorder;
        let r:FileUpdatePackage = this.joinFileUpdatePackages(record.fileUpdatePackages,origin,len);
        record.fileUpdatePackages[origin] = r;
        record.fileUpdatePackages.splice(origin+1,len-1);
    }

    private pushFileUpdatePackage(events:FileUpdateEvent[]) {
        let record = this.fileUpdatePackageRecorder;
        let version = record.fileUpdatePackages.length>0?record.fileUpdatePackages[record.fileUpdatePackages.length-1].version+1:1;
        record.fileUpdatePackages.push({
            'version':version,
            'updateRecords':events
        });
        if(record.fileUpdatePackages.length > record.maxSize)
        {
            this.saveJoinFileUpdatePackages(record.maxSize-5,5);
            if(++record.maxSize>ProjectManager.maxFileUpdatePackageSize)
            {
                record.maxSize=5;
            }
        }
        this.workspaceState.update(ProjectManager.fileUpdatePackageRecorderKey,this.fileUpdatePackageRecorder);
    }

    private packageAllUpdateEvents() {
        if(this.fileUpdateEvents.length===0)
        {
            return ;
        }
        let r = this.packageFileUpdateEvents(this.fileUpdateEvents);
        this.fileUpdateEvents = [];
        this.lastChangePath = undefined;
        this.workspaceState.update(ProjectManager.fileUpdateEventsKey,this.fileUpdateEvents);
        this.pushFileUpdatePackage(r);
    }


    private findSetFile(file:string,outDirectory:string[],outFiles:string[])
    {
        //console.log(this.rootfsPath+SEP+file);
        let files = fs.readdirSync(this.rootfsPath+SEP+file);
        files.forEach((fileName,index)=>{
            //console.log(fileName);
            let path = file ==="" ? fileName : file + SEP + fileName;
            let state = fs.statSync(this.rootfsPath+SEP +path);
            if(state.isDirectory()){
                outDirectory.push(path);
                this.findSetFile(path,outDirectory,outFiles);
            }else{
                if(!this.isIgnoreFileByRelativePath(path))
                {
                    outFiles.push(path);
                }
            }
        });
    }


    private setUpdateFilePath(directorys:string[],files:string[])
    {
        let size = directorys.length;
        for(let i=0;i<size;i++)
        {
            this.findSetFile(directorys[i],directorys,files);
        }
    }

    private getNewestVersion():number {
        let packages = this.fileUpdatePackageRecorder.fileUpdatePackages;
        if(packages.length === 0)
        {
            packages.push({
                version:1,
                updateRecords:[]
            });
        }
        return packages[packages.length-1].version;;
    }

    private fileUpdateEventsToFileUpdateRecord(fileUpdateEvents:FileUpdateEvent[]):FileUpdateRecord
    {
        let r:FileUpdateRecord = {version:this.getNewestVersion()};
        let event;
        for(let i=0;i<fileUpdateEvents.length;i++)
        {
            event = fileUpdateEvents[i];
            if(event.eventType === FileEventType.Change)
            {
                r.newFile = r.newFile ||[];
                r.newFile.push(event.path);
            }else if(event.eventType === FileEventType.Create)
            {
                if(event.type === FileType.Directory)
                {
                    r.newDirectory = r.newDirectory || [];
                    r.newDirectory.push(event.path);
                }else{
                    r.newFile = r.newFile ||[];
                    r.newFile.push(event.path);
                }
            }else{
                if(event.type === FileType.Directory)
                {
                    r.deleteDirectory = r.deleteDirectory || [];
                    r.deleteDirectory.push(event.path);
                }else{
                    r.deleteFile = r.deleteFile ||[];
                    r.deleteFile.push(event.path);
                }
            }
        }
        return r;
    }

    /**
     * readFile
     */
    public readFile(path:string):Buffer|undefined {
        try{
            let data:Buffer = fs.readFileSync(this.rootfsPath+SEP+path);
            return data;
        }catch(e)
        {
            console.error(e);
        }

    }

    /**
     * getNeedUpdataEvents
     */
    public getNeedUpdateEvents(version:number):FileUpdateRecord|undefined {
        //console.log('start get update events',version);
        let result:FileUpdateRecord ;
        let packages = this.fileUpdatePackageRecorder.fileUpdatePackages;
        this.packageAllUpdateEvents();
        if(version ===0 || packages.length === 0)
        {
            result= {version:this.getNewestVersion(),newDirectory:[],newFile:[]};
            this.findSetFile("",result.newDirectory as string[],result.newFile as string[]);
        }else if(this.getNewestVersion() ===version)
        {
            return undefined;
        }else{
            let index = 0;
            for(let i=packages.length-1;i>0;i--)
            {
                if(packages[i].version<=version)
                {
                    index = i+1;
                    break;
                }
            }
            let r = this.joinFileUpdatePackages(packages,index,packages.length-index);
            result = this.fileUpdateEventsToFileUpdateRecord(r.updateRecords);
            if(result.newDirectory)
            {
                if(!result.newFile)
                {
                    result.newFile =[];
                }
                this.setUpdateFilePath(result.newDirectory,result.newFile);
            }
        }
        //console.log('end get update events');
        return result;
    }

    private asRelativePath(fsPath:string):string
    {
        return fsPath.substr(this.rootfsPath.length+1);
    }


    private pushFileUpdateEvent(uri:Uri,eventType:FileEventType)
    {
        if(this.isIgnoreFile(uri.path))
        {
            return ;
        }
        //console.log("update file",FileEventType[eventType],uri.fsPath);
        //console.log(JSON.stringify(this.fileUpdateEvents));
        let path = this.asRelativePath(uri.fsPath);
        let type:FileType;
        if(eventType === FileEventType.Create)
        {
            this.typeRecord[path] = fs.statSync(uri.fsPath).isDirectory()?FileType.Directory:FileType.File;
            type = this.typeRecord[path];
        }else if(eventType === FileEventType.Delect)
        {
            type = this.typeRecord[path];
            if(!type)
            {
                //console.log("unknown type",path,JSON.stringify(this.typeRecord));
            }

            delete this.typeRecord[path];
        }else
        {
            type = this.typeRecord[path];
            if(!type)
            {
                this.typeRecord[path] = fs.statSync(uri.fsPath).isDirectory()?FileType.Directory:FileType.File;
                type = this.typeRecord[path];
            }
        }



        if(type === FileType.Directory && eventType === FileEventType.Change)
        {
            return;
        }
        let event:FileUpdateEvent = {
            eventType:eventType,
            path:path,
            type:type
        };
        this.fileUpdateEvents.push(event);
        if(this.fileUpdateEvents.length >ProjectManager.maxFileUpdateEventsSize)
        {
            this.packageAllUpdateEvents();
        }else{
            this.workspaceState.update(ProjectManager.fileUpdateEventsKey,this.fileUpdateEvents);
        }
        //console.log(JSON.stringify(this.fileUpdateEvents));
    }



    /**
     * initialize
     */
    public static initialize(context:ExtensionContext) {
        if(workspace.name && !ProjectManager.instance)
        {
            ProjectManager.instance = new ProjectManager(context);
        }
    }

    public static getInstance() :ProjectManager
    {
        return <ProjectManager>ProjectManager.instance;
    }
}