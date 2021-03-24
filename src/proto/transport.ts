
import { Message } from "./debugMessage"
import * as net from "net"


interface ITransport
{
    send(message:Message):void;

}

export interface TransportListener
{
    onReceiveMessage(message:Message):void;
    onError(hasError:Error):void;
    onConnect():void;
}

export class Transport implements ITransport
{
    private socket:net.Socket;
    private sendHeader:Buffer;


    private receiveHeader:Buffer;

    private targetSize:number;
    private completedSize:number;
    private targetBuffer:Buffer;



    private listener:TransportListener;

    constructor(ip:string,port:number,listener:TransportListener)
    {
        this.listener = listener;
        this.sendHeader = Buffer.alloc(4);
        this.socket = net.connect(port,ip,()=>{
            listener.onConnect();
        });
        this.socket.on("error",(hasError)=>{
            listener.onError(hasError);
        });
        this.receiveHeader = Buffer.alloc(4);
        this.targetSize = 4;
        this.targetBuffer = this.receiveHeader;
        this.completedSize = 0;
        this.socket.on("data",(data)=>{
            this.onReceive(data);
        })
    }


    private onCompletedTargetBuffer()
    {
        this.completedSize = 0;
        if(this.targetBuffer == this.receiveHeader)
        {
            this.targetSize = this.receiveHeader.readInt32LE(0);
            this.targetBuffer = Buffer.alloc(this.targetSize);
        }else{
            this.listener.onReceiveMessage(Message.decode(this.targetBuffer,this.targetSize));
            this.targetSize = 4;
            this.targetBuffer = this.receiveHeader;
        }
    }

    private onReceiveData(data:Buffer,offset:number)
    {
        let count = data.copy(this.targetBuffer,this.completedSize,offset);
        this.completedSize += count;
        offset += count;
        if(this.completedSize == this.targetSize)
        {
            this.onCompletedTargetBuffer();
            if(offset < data.length)
            {
                this.onReceiveData(data,offset);
            }
        }
    }

    private onReceive(data:Buffer)
    {
        this.onReceiveData(data,0);
    }

    public send(message:Message)
    {
        //console.log(message.toJSON())
        let buffer = Message.encode(message).finish();
        let size = buffer.byteLength;
        this.sendHeader.writeInt32LE(size,0);
        this.socket.write(this.sendHeader);
        this.socket.write(buffer);
    }

    public close()
    {
        if(!this.socket.destroyed)
        {
            this.socket.destroy();
        }
    }
}