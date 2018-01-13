'use strict' // 嚴謹模式

const
    crypto = require('crypto'), // 加密模組
    tokenCrypto = require('wechat-crypto'), //微信Token解密
    https = require('https'), // htts模組
    http = require('http'), // http模組
    util = require('util'), // util 工具
    fs = require('fs'), // file system
    parseString = require('xml2js').parseString, // xml轉js模組
    accessTokenJson = require('./access_token'), // access_token.json
    menus = require('./menus'), // 微信選單
    msg = require('./msg'),// 訊息處理
    CryptoGraphy = require('./cryptoGraphy'); // 微信消息加解密模組

/**
 * 构建 WeChat 对象 即 js中 函数就是对象
 * @param {JSON} config 微信配置文件 
 */
var WeChat = function(config){
    this.config = config;
    //token
    this.token = process.env.token;
    //corpId
    this.corpId = process.env.corpId;
    //應用Serret(1000002)
    this.agentSecret1000002 = process.env.agentSecret1000002;
    //通訊錄Secret
    this.directorySecret = process.env.directorySecret;
    //ApiUrl
    this.ApiURL = config.ApiURL;
    //管理員UserId
    this.adminId = process.env.adminId;

    /**
     * 用于处理 https Get请求方法
     * @param {String} url 请求地址 
     */
    this.requestGet = function(url){
        return new Promise(function (resolve, reject) {
            https.get(url, function (res) {
                var chunks = [], result = "", size = 0;
                res.on('data', function (chunk) {
                    chunks.push(chunk);
                    size += chunk.length;
                });
                res.on('end', function () {
                    var data = null;
                    switch (chunks.length) {
                        case 0: data = new Buffer(0);
                            break;
                        case 1: data = chunks[0];
                            break;
                        default:
                            data = new Buffer(size);
                            for (var i = 0, pos = 0, l = chunks.length; i < l; i++) {
                                var chunk = chunks[i];
                                chunk.copy(data, pos);
                                pos += chunk.length;
                            }
                            break;
                    }
                    if (data === '[]') {
                        console.log("Empty result.");
                    }
                    else {
                        resolve(data);
                    }
                });
            }).on('error', function (err) {
                reject(err);
            });
        });
    }

    /**
     * 消息發送
     * @param {JSON} post_data 
     */
    this.postMsg = function (access_token, post_data){
        return new Promise(function (resolve, reject) {
            // post options
            var paraPost = '?access_token=' + access_token;
            var post_options = {
                host: 'qyapi.weixin.qq.com',
                port: '443',
                path: '/cgi-bin/message/send' + paraPost,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': (new Buffer(post_data)).length
                }
            };

            // Set up the request
            var post_req = https.request(post_options, function (res) {
                var buffer = [], result = '';
                res.charset = 'utf-8';
                res.on('data', function (data) {
                    buffer.push(data);
                });
                res.on('end', function () {
                    result = Buffer.concat(buffer).toString('utf-8');
                    resolve(result);
                })
            })
            //监听错误事件
            .on('error', function (err) {
                console.log(err);
                reject(err);
            });

            // post the data
            post_req.write(post_data);
            post_req.end();
        });
    }
}

/**
 * 微信接口驗證
 * @param {Request} req Request 對象
 * @param {Response} res Response 對象
 */
WeChat.prototype.auth = function(req,res){

    // var that = this;
    // this.getAccessToken().then(function(data){
    //     //格式化请求连接
    //     var url = util.format(that.apiURL.createMenu,that.apiDomain,data);
    //     //使用 Post 请求创建微信菜单
    //     that.requestPost(url,JSON.stringify(menus)).then(function(data){
    //         //讲结果打印
    //         console.log(data);
    //     });
    // });

        //1.获取微信服务器Get请求的参数 signature、timestamp、nonce、echostr
        var signature = req.query.signature,//微信加密签名
            timestamp = req.query.timestamp,//时间戳
            nonce = req.query.nonce,//随机数
            echostr = req.query.echostr;//随机字符串
        //var cryptor = new tokenCrypto(process.env.token, process.env.encodingAESKey, process.env.corpId)
        //var s = cryptor.decrypt(echostr);
        //2.将token、timestamp、nonce三个参数进行字典序排序
        var array = [this.token,timestamp,nonce];
        array.sort();

        //3.将三个参数字符串拼接成一个字符串进行sha1加密
        var tempStr = array.join('');
        const hashCode = crypto.createHash('sha1'); //创建加密类型 
        var resultCode = hashCode.update(tempStr,'utf8').digest('hex'); //对传入的字符串进行加密

        //4.开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
        if(resultCode === signature){
            res.send(echostr);
        }else{
            res.send('mismatch');
        }
}

/**
 * 取得access_token
 * @param {String} secretType secret類型
 * @param {String} secret secret
 */
WeChat.prototype.getAccessToken = function (secretType,secret){
    var that = this;
    return new Promise(function(resolve,reject){
        // 目前時間
        var currentTime = new Date().getTime();
        // 格式化URL
        //console.log("accessTokenApi=" + that.config.ApiURL.accessTokenApi);
        var url = util.format(that.config.ApiURL.accessTokenApi, process.env.corpId, secret);
        // 判斷accessToken是否還有效
        // 已過期時重取
        //console.log("url=" + url + ",secretType=" + secretType);
        switch (secretType) {
            case 'directory':
                if (accessTokenJson.directory.access_token === "" || accessTokenJson.directory.expires_time < currentTime) {
                    that.requestGet(url).then(function (data) {
                        var result = JSON.parse(data);
                        if (result.errcode == "0") {
                            accessTokenJson.directory.access_token = result.access_token;
                            accessTokenJson.directory.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                            // 更新 accessToken.json
                            fs.writeFile('./wechat/access_token.json', JSON.stringify(accessTokenJson));
                            console.log("update " + secretType + " accessToken:" + JSON.stringify(accessTokenJson.directory));
                            // return access_token 
                            resolve(accessTokenJson.directory.access_token);
                        } else {
                            // return error msg
                            resolve(result);
                        }
                    });
                    //尚未過期，直接返回    
                } else {
                    resolve(accessTokenJson.directory.access_token);
                }
                break;
            case 'agent1000002':
                if (accessTokenJson.agent1000002.access_token === "" || accessTokenJson.agent1000002.expires_time < currentTime) {
                    that.requestGet(url).then(function (data) {
                        var result = JSON.parse(data);
                        if (result.errcode == "0") {
                            accessTokenJson.agent1000002.access_token = result.access_token;
                            accessTokenJson.agent1000002.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                            // 更新 accessToken.json
                            fs.writeFile('./wechat/access_token.json', JSON.stringify(accessTokenJson));
                            console.log("update " + secretType + " accessToken:" + JSON.stringify(accessTokenJson.agent1000002));
                            // return access_token 
                            resolve(accessTokenJson.agent1000002.access_token);
                        } else {
                            // return error msg
                            resolve(result);
                        }
                    });
                //尚未過期，直接返回    
                } else {
                    resolve(accessTokenJson.agent1000002.access_token);
                }
                break;
            default:
                
                break;
        }
    });
}

/**
 * 微信訊息接收處理
 * @param {Request} req Request
 * @param {Response} res Response
 */
WeChat.prototype.handleMsg = function(req,res){
    var buffer = [],that = this;
    var cryptoGraphy = new CryptoGraphy(that.config,req);

    //接收資料
    req.on('data',function(data){
        buffer.push(data);
    });
    //處理接收完成的資料
    req.on('end',function(){
        var msgXml = Buffer.concat(buffer).toString('utf-8');

        //解析xml
        parseString(msgXml, { explicitArray: false }, function (err, result) {
            //console.log("result=" + JSON.stringify(result));
            if(!err){
                result = result.xml;
                //消息解密
                result = cryptoGraphy.decryptMsg(result.Encrypt);
                var toUser = result.ToUserName; //接收方
                var fromUser = result.FromUserName;//發送方
                var reportMsg = ""; 

                //判斷訊息類型
                //事件
                if(result.MsgType.toLowerCase() === "event"){
                    //判斷事件類型
                    switch (result.Event.toLowerCase()) {
                        //成員加入
                        case 'subscribe':
                            var content = "您好，敬鵬微信推播Bot歡迎您\n";
                            reportMsg = msg.txtMsg(fromUser,toUser,content);
                            break;
                        //選單按鈕
                        case 'click':
                             var contentArr = [
                                {Title:"Node.js 微信自定义菜单",Description:"使用Node.js实现自定义微信菜单",PicUrl:"http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72868520"},
                                {Title:"Node.js access_token的获取、存储及更新",Description:"Node.js access_token的获取、存储及更新",PicUrl:"http://img.blog.csdn.net/20170528151333883?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72783631"},
                                {Title:"Node.js 接入微信公众平台开发",Description:"Node.js 接入微信公众平台开发",PicUrl:"http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72765279"}
                            ];
                            reportMsg = msg.graphicMsg(fromUser,toUser,contentArr);
                        break;
                    }
                }
                //文字
                else if(result.MsgType.toLowerCase() === "text"){
                    //根據使用者輸入訊息回傳值
                    switch (result.Content) {
                        case '文字':
                            var content = "Echo:" + result.Content;
                            reportMsg = msg.txtMsg(fromUser, toUser, content);
                            break;
                        case '圖文選單':
                            var contentArr = [
                                { Title: "Node.js 微信自定义菜单", Description: "使用Node.js实现自定义微信菜单", PicUrl: "http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast", Url: "http://blog.csdn.net/hvkcoder/article/details/72868520" },
                                { Title: "Node.js access_token的获取、存储及更新", Description: "Node.js access_token的获取、存储及更新", PicUrl: "http://img.blog.csdn.net/20170528151333883?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast", Url: "http://blog.csdn.net/hvkcoder/article/details/72783631" },
                                { Title: "Node.js 接入微信公众平台开发", Description: "Node.js 接入微信公众平台开发", PicUrl: "http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast", Url: "http://blog.csdn.net/hvkcoder/article/details/72765279" }
                            ];
                            reportMsg = msg.graphicMsg(fromUser, toUser, contentArr);
                            break;
                        case '管理員':
                            user.getUser("A0012272");
                        default:
                            var content = "無此指令!\n";
                            content += "請輸入正確指令或洽台灣資訊處(#1409)";;
                            reportMsg = msg.txtMsg(fromUser, toUser, content);
                            break;
                    }
                }
                //回復訊息加密
                reportMsg = cryptoGraphy.encryptMsg(reportMsg);
                //返回给微信伺服器
                res.send(reportMsg);

            }else{
                //打印错误
                console.log(err);
            }
        });
    });
}

/**
 * 讀取成員
 * @param {Request} userid
 */
WeChat.prototype.getUser = function (accessToken, userid) {
    var that = this;
    return new Promise(function (resolve, reject) {
        var url = util.format(process.env.API, accessToken, userid);
        //console.log("url=" + url);
        that.requestGet(url).then(function (data) {
            //console.log("requestGetdata=" + data);
            var result = JSON.parse(data);
            //
            if (result.errcode == "0") {
                console.log(JSON.stringify(result));
            } else {
                // return error msg
                console.log("error, errcode=" + result.errcode);
                resolve(result);
            }
        });
    });
}

//暴露可供外部访问的接口
module.exports = WeChat;