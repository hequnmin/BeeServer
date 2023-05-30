import dgram, { RemoteInfo } from 'dgram';
import moment from 'moment';
import Doing from './Doing';

const HOST = '192.168.1.114';
// const HOST = '10.15.5.151';
// const HOST = '10.15.46.125';
const PORT = 65432;

const DOING_KEY = {
    login : 'login',
    logout : 'logout',
    find : 'find'
}

const ERROR_INFO = {
    illegalMessage: { code : 10001, info : '非法消息'},
    authenticationFail: { code : 10002, info : '身份验证失败！'},
}

const SIGN = 'TheFiveBoxingWizardsJumpQuickly.';

// 创建一个UDP服务器对象
const server = dgram.createSocket('udp4');
const requireDoing = new Doing(server);

console.log('Hello World!');

// 监听消息事件
server.on('message', (buffer, remoteInfo) => {
    console.log(`来自${remoteInfo.address}:${remoteInfo.port}的消息: ${buffer}`);
    
    var message;
    try {
        let msg = buffer.toString();
        message = JSON.parse(msg);
    } catch (err) {
        console.error(`来自${remoteInfo.address}:${remoteInfo.port}的消息，消息解析错误！${err}`);
        return;
    }
    requireDoing.MessageReceived(remoteInfo, message);
    
});

// 监听错误事件
server.on('error', (err) => {
  console.log(`监听发生错误：\n${err.stack}`);
  server.close();
});

// 监听服务器绑定事件
server.on('listening', () => {
    const address = server.address();
    console.log(`监听已启动！`);
});

// 绑定服务器到指定的地址和端口
console.log(`服务器：${HOST}:${PORT}`);
server.bind(PORT, HOST);




