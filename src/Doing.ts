import dgram, { RemoteInfo } from 'dgram';
import moment from 'moment';
import PostgreSQLClient from './PostgreSQLClient';
import md5 from 'md5';


class Doing {

    private server: dgram.Socket;
    private pgclient: PostgreSQLClient;

    private APPKEY: string;
    private SECRET: string;
    private DOING_KEY = {
        login: 'login',
        logout: 'logout',
        find: 'find',
        heartbeat: 'heartbeat'
    };

    constructor(srv: dgram.Socket) {
        this.APPKEY = "BeeChat";
        //this.SECRET = "TheFiveBoxingWizardsJumpQuickly.";
        this.SECRET = "TheFive";

        this.server = srv;
        this.pgclient = new PostgreSQLClient();

    }

    public MessageReceived(rinfo: RemoteInfo, msg: any) {
        if (msg == null) {
            console.error(`来自${rinfo.address}:${rinfo.port}的消息，非法消息！`);
            const response = {
                error: {
                    code: 1,
                    info: '非法消息'
                }
            };

        } else {
            if (msg.type == null) {
                console.error(`来自${rinfo.address}:${rinfo.port}的消息，参数错误！`);
                return;
            }

            const { token, type, data } = msg;

            switch (type) {
                case this.DOING_KEY.login:
                    console.log(`来自${rinfo.address}:${rinfo.port}的消息，执行登录！`);
                    this.Login(rinfo, data);
                    break;
                case this.DOING_KEY.logout:
                    console.log(`来自${rinfo.address}:${rinfo.port}的消息，注销登录！`);
                    this.Logout(rinfo, token, data);
                    break;
                case this.DOING_KEY.find:
                    console.log(`来自${rinfo.address}:${rinfo.port}的消息，执行查找！`);
                    this.Find(rinfo, token, data);
                    break;
                case this.DOING_KEY.heartbeat:
                    console.log(`来自${rinfo.address}:${rinfo.port}的消息，在线心跳！`);
                    this.HeartBeat(rinfo, token, data);
                    break;
                default:
                    console.error(`来自${rinfo.address}:${rinfo.port}的消息，参数错误！`);
                    break;
            }


        }
    }

    private CreateToken(): any {

        const sign = md5(this.APPKEY + this.SECRET);
        const token = { sign: sign };
        return token;
    }

    private VerifyToken(token: any): boolean {

        try {
            const sign = md5(this.APPKEY + this.SECRET);
            if (token) {
                if (token.sign == sign) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } catch {
            return false;
        }

    }

    public Login(rinfo: RemoteInfo, body: any) {
        var table = "login";

        // var wheres = {
        //     userno: body.userno,
        //     mac: body.mac
        // };
        var wheres = {
            userno: body.userno
        };

        var fields = {
            userno: body.userno,
            address: rinfo.address,
            port: rinfo.port,
            mac: body.mac,
            lastlogin: moment().format('YYYY-MM-DD HH:mm:ss'),
        };

        const stamp = moment.now().toString();
        const token = this.CreateToken();


        this.pgclient.update(table, wheres, fields).then((result) => {
            if (result.rows.length <= 0) {
                this.pgclient.insert(table, fields).then((res) => {
                    var error = { code: 0, info: '' };
                    var response =
                    {
                        type: "login",
                        result: {
                            token: token,
                            user: {
                                userid: res[0].userid,
                                userno:body.userno,
                                address: rinfo.address,
                                port: rinfo.port,
                                addressMSg: body.address,
                                portMsg:body.port
                            }
                        },
                        error: error
                    };
                    this.server.send(JSON.stringify(response), rinfo.port, rinfo.address);
                });
            } else {
                var error = { code: 0, info: '' };
                var response =
                {
                    type: "login",
                    result: {
                        token: token,
                        user: {
                            userid: result.rows[0].userid,
                            userno:body.userno,
                            address: rinfo.address,
                            port: rinfo.port,
                            addressMSg: body.address,
                            portMsg:body.port
                        }
                    },
                    error: error
                };
                this.server.send(JSON.stringify(response), rinfo.port, rinfo.address);
            }
        });
        return true;
    }

    public Logout(rinfo: RemoteInfo, token: any, body: any) {
        if (!this.VerifyToken(token)) {
            const error = { error: { code: 1, info: `Token verify failed!` } };
            this.server.send(JSON.stringify(error), rinfo.port, rinfo.address);
            return;
        }

        var table = "login";

        var primarys = {
            userno: body.userno,
        };

        this.pgclient.delete(table, primarys).then((res) => {
            var error = { error: { code: 0, info: '' } };
            var result = res.rows;
            var response = { result, error };
            this.server.send(JSON.stringify(response), rinfo.port, rinfo.address);
        });
    }

    public Find(rinfo: RemoteInfo, token: any, filter: any) {
        if (!this.VerifyToken(token)) {
            const error = { type: "find", error: { code: 1, info: `Token verify failed!` } };
            this.server.send(JSON.stringify(error), rinfo.port, rinfo.address);
            return;
        }

        var { entity, prop } = filter;

        this.pgclient.find(entity, prop)
            .then((result) => {
                const found = { type: "find", result: result.rows, error: { code: 0, info: '' } };
                this.server.send(JSON.stringify(found), rinfo.port, rinfo.address);
            })
            .catch((e) => {
                const error = { type: "find", error: { code: e.code, info: `${e.message}` } };
                this.server.send(JSON.stringify(error), rinfo.port, rinfo.address);
            });
    }
    public HeartBeat(rinfo: RemoteInfo, token: any, filter: any) {
        if (!this.VerifyToken(token)) {
            const error = { type: "heartbeat", error: { code: 1, info: `Token verify failed!` } };
            this.server.send(JSON.stringify(error), rinfo.port, rinfo.address);
            return;
        }
        const found = { type: "heartbeat", result: "ok", error: { code: 0, info: '' } };
        this.server.send(JSON.stringify(found), rinfo.port, rinfo.address);
    }
}

export default Doing;