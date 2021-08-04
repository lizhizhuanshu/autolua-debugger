import * as vscode from 'vscode';
import * as dgram from "dgram";


export class RemoteHostProvider implements vscode.TreeDataProvider<RemoteHost>{
    private remoteHostInfo:Set<dgram.RemoteInfo>= new Set<dgram.RemoteInfo>();
    private _onDidChangeTreeData: vscode.EventEmitter<RemoteHost | undefined | null | void> = new vscode.EventEmitter<RemoteHost | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RemoteHost | undefined | null | void> = this._onDidChangeTreeData.event;
    private isRefreshing = false;
    private getPort():number|undefined{
        return vscode.workspace.getConfiguration("AutoLua.settings").get("port");;
    }

    refresh(): void {
        this.remoteHostInfo.clear();
        this._onDidChangeTreeData.fire();
        let port:number|undefined = this.getPort();
        if(port != undefined )
        {
            if(! this.isRefreshing)
            {
                this.isRefreshing = true;
                let server = dgram.createSocket("udp4");
                server.on("error", function (err) {
                    console.log("server error:\n" + err.stack);
                    server.close();
                });
                server.on("message",(message,info)=>{
                    if(message.equals(Buffer.from("I am AutoLuaClient")))
                    {
                        console.log("add remote host "+info.address);
                        this.remoteHostInfo.add(info);
                        this._onDidChangeTreeData.fire();
                    }
                });
                server.bind(port);
                setTimeout((server:dgram.Socket)=>{
                    this.isRefreshing = false;
                    server.close()
                },1000,server)
            }
            var socket = dgram.createSocket("udp4");
            socket.bind(function () {
                socket.setBroadcast(true);
            });
            var message = Buffer.from("Where is AutoLuaClient");
            socket.send(message, 0, message.length, port, '255.255.255.255', function(err, bytes) {
                socket.close();
            });
        }
    }

    getTreeItem(element:RemoteHost):vscode.TreeItem
    {
        return element;
    }

    getChildren(element?: RemoteHost): Thenable<RemoteHost[]>{
        let port = this.getPort() || -1;
        let hosts:RemoteHost[] = new Array();
        this.remoteHostInfo.forEach((value)=>{
            hosts.push(new RemoteHost(value.address,port));
        })
        return Promise.resolve(hosts);
    }
}

export class RemoteHost extends vscode.TreeItem{
    private address:string;
    private port:number;
    constructor(address:string,port:number)
    {
        super(address,vscode.TreeItemCollapsibleState.None);
        this.address = address;
        this.port = port;
    }
    getAddress():string
    {
        return this.address;
    }

    getPort():number{
        return this.port;
    }
}