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
                res.on('data', function (chunk) {
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
        var url = util.format(that.config.ApiURL.accessTokenApi, process.env.corpId, secret);
        // 判斷accessToken是否還有效
        // 已過期時重取
        console.log("url=" + url + ",secretType=" + secretType);
        switch (secretType) {
            case 'directory':
                
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
                    //将本地存储的 access_token 返回
                    resolve(accessTokenJson.agent1000002.access_token);
                }
                break;
            default:
                
                break;
        }
    });
}

/**
 * 微信消息处理
 * @param {Request} req Request 对象
 * @param {Response} res Response 对象
 */
WeChat.prototype.handleMsg = function(req,res){
    var buffer = [],that = this;

    //实例微信消息加解密
    var cryptoGraphy = new CryptoGraphy(that.config,req);

    //监听 data 事件 用于接收数据
    req.on('data',function(data){
        buffer.push(data);
    });
    //监听 end 事件 用于处理接收完成的数据
    req.on('end',function(){
        var msgXml = Buffer.concat(buffer).toString('utf-8');
        //解析xml
        parseString(msgXml,{explicitArray : false},function(err,result){
            if(!err){
                result = result.xml;
                //判断消息加解密方式
                if(req.query.encrypt_type == 'aes'){
                    //对加密数据解密
                    result = cryptoGraphy.decryptMsg(result.Encrypt);
                }
                var toUser = result.ToUserName; //接收方微信
                var fromUser = result.FromUserName;//发送仿微信
                var reportMsg = ""; //声明回复消息的变量

                //判断消息类型
                if(result.MsgType.toLowerCase() === "event"){
                    //判断事件类型
                    switch(result.Event.toLowerCase()){
                        case 'subscribe':
                            //回复消息
                            var content = "欢迎关注 hvkcoder 公众号，一起斗图吧。回复以下数字：\n";
                                content += "1.你是谁\n";
                                content += "2.关于Node.js\n";
                                content += "回复 “文章”  可以得到图文推送哦~\n";
                            reportMsg = msg.txtMsg(fromUser,toUser,content);
                        break;
                        case 'click':
                             var contentArr = [
                                {Title:"Node.js 微信自定义菜单",Description:"使用Node.js实现自定义微信菜单",PicUrl:"http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72868520"},
                                {Title:"Node.js access_token的获取、存储及更新",Description:"Node.js access_token的获取、存储及更新",PicUrl:"http://img.blog.csdn.net/20170528151333883?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72783631"},
                                {Title:"Node.js 接入微信公众平台开发",Description:"Node.js 接入微信公众平台开发",PicUrl:"http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72765279"}
                            ];
                            //回复图文消息
                            reportMsg = msg.graphicMsg(fromUser,toUser,contentArr);
                        break;
                    }
                }else{
                     //判断消息类型为 文本消息
                    if(result.MsgType.toLowerCase() === "text"){
                        //根据消息内容返回消息信息
                        switch(result.Content){
                            case '1':
                                reportMsg = msg.txtMsg(fromUser,toUser,'Hello ！我的英文名字叫 H-VK');
                            break;
                            case '2':
                                reportMsg = msg.txtMsg(fromUser,toUser,'Node.js是一个开放源代码、跨平台的JavaScript语言运行环境，采用Google开发的V8运行代码,使用事件驱动、非阻塞和异步输入输出模型等技术来提高性能，可优化应用程序的传输量和规模。这些技术通常用于数据密集的事实应用程序');
                            break;
                            case '文章':
                                var contentArr = [
                                    {Title:"Node.js 微信自定义菜单",Description:"使用Node.js实现自定义微信菜单",PicUrl:"http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72868520"},
                                    {Title:"Node.js access_token的获取、存储及更新",Description:"Node.js access_token的获取、存储及更新",PicUrl:"http://img.blog.csdn.net/20170528151333883?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72783631"},
                                    {Title:"Node.js 接入微信公众平台开发",Description:"Node.js 接入微信公众平台开发",PicUrl:"http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72765279"}
                                ];
                                //回复图文消息
                                reportMsg = msg.graphicMsg(fromUser,toUser,contentArr);
                            break;
                            default:
                                reportMsg = msg.txtMsg(fromUser,toUser,'没有这个选项哦');
                            break;
                        }
                    }
                }
                //判断消息加解密方式，如果未加密则使用明文，对明文消息进行加密
                reportMsg = req.query.encrypt_type == 'aes' ? cryptoGraphy.encryptMsg(reportMsg) : reportMsg ;
                //返回给微信服务器
                res.send(reportMsg);

            }else{
                //打印错误
                console.log(err);
            }
        });
    });
}

//暴露可供外部访问的接口
module.exports = WeChat;