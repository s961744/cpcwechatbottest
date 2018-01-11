const
    express = require('express'),
    WXBizMsgCrypt = require('wechat-crypto'),
    wechat = require('wechat-enterprise'),
    config = require('./config'),
    accessTokenJson = require('./accessToken'),
    http = require("http"),
    https = require("https"),
    util = require('util'),
    fs = require('fs'),
    schedule = require('node-schedule'),
    parseString = require('xml2js').parseString;


// 排程 1次/30sec (每分鐘的5秒及35秒)
var job = schedule.scheduleJob('5,35 * * * * *', function () {
    // 設定GET RESTful API連接參數
    var optionsGet = {
        host: '116.50.39.201',
        port: 7102,
        path: '/WechatRESTful/resources/WechatRESTfulTest',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    };

    // 取得wechat_message_send中的待發訊息並發送
    try {
        http.request(optionsGet, function (resGET) {
            //console.log('STATUS: ' + res.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(res.headers));
            var chunks = [];
            var size = 0;
            //resGET.setEncoding('utf8');
            resGET.on('data', function (chunk) {
                chunks.push(chunk);
                size += chunk.length;
            });
            resGET.on('end', function () {
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
                if (data.length < 3) {
                    console.log('No messages need to be sent.');
                }
                else {
                    console.log(data);
                    try {
                        var jdata = JSON.parse(data);
                        jdata.forEach(function (row) {
                            var message_id = row.message_id;
                            var user_id = row.user_id;
                            var message = row.message;
                            try {
                                var post_data = JSON.parse(JSON.stringify('{"touser": "' + user_id + '", "msgtype": "text", "agentid": 1000002,"text" : {"content" : "' + message + '"},"safe": 0}'));
                                console.log(JSON.stringify(post_data));

                                getAccessToken().then(function (data) {
                                    postMsg(accessTokenJson.directory.access_token, post_data);
                                });
                                // 設定PUT RESTful API連接參數
                                var paraPut = '?strMessageId=' + message_id;
                                var optionsPut = {
                                    host: '116.50.39.201',
                                    port: 7102,
                                    path: '/WechatRESTful/resources/WechatRESTfulTest' + paraPut,
                                    method: 'PUT'
                                };
                                try {
                                    // 發送後寫入actual_send_time
                                    http.request(optionsPut, function (resPUT) {
                                        resPUT.setEncoding('utf8');
                                        resPUT.on('data', function (chunkPUT) {
                                            console.log(chunkPUT);
                                        });
                                    }).end();
                                }
                                catch (e) {
                                    return console.log("http request fail:" + JSON.stringify(optionsPut));
                                }
                            }
                            catch (e) {
                                return console.log(e);
                            }
                        });
                    }
                    catch (e) {
                        return console.log(e);
                    }
                }
            });
        }).end();
    }
    catch (e) {
        return console.log("http request fail:" + JSON.stringify(optionsGet));
    }
});


var app = express();
var API = wechat.API;
var api = new API(process.env.corpId, process.env.agentSecret1000002, '1000002');

app.get('/', function (req, res) {
    var msg_signature = req.query.msg_signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var echostr = req.query.echostr;
    var cryptor = new WXBizMsgCrypt(process.env.token, process.env.encodingAESKey, process.env.corpId)
    var s = cryptor.decrypt(echostr);
    res.send(s.message);
    console.log("s.message=" + s.message);
    
    //var msg = '【耀元】:\nTEST消息发送(简体)\n123456.';
    //var message = {
    //    'msgtype': 'text',
    //    'text': {
    //        'content': msg
    //    }
    //};
    //var touser = 'A0012272';
    //var toUsers = {
    //    'touser': touser
    //}
    //api.send(toUsers, message, function (err, result) {
    //    if (err) {
    //        console.log('消息發送失敗:' + JSON.stringify(err));

    //    }
    //});
});

app.post('/', function (req, res) {
    handleMsg(req, res);
});

/**
 * 接收消息
 */
function handleMsg(req, res) {
    var buffer = [];
    //监听 data 事件 用于接收数据
    req.on('data', function (data) {
        buffer.push(data);
    });
    //监听 end 事件 用于处理接收完成的数据
    req.on('end', function () {
        var msgXml = Buffer.concat(buffer).toString('utf-8');
        //解析xml
        parseString(msgXml, { explicitArray: false }, function (err, result) {
            if (!err) {
                result = result.xml;
                if (req.query.encrypt_type == 'aes') {
                    //对加密数据解密
                    result = cryptoGraphy.decryptMsg(result.Encrypt);
                }
                var toUser = result.ToUserName; //接收方微信
                var fromUser = result.FromUserName;//发送仿微信
                console.log("result=" + result);
                if (result.MsgType.toLowerCase() === "event") {
                    console.log("Event=" + result.Event);
                    //判断事件类型
                    switch (result.Event.toLowerCase()) {
                        case 'subscribe':
                            //回复消息
                            res.send(txtMsg(fromUser, toUser, '欢迎关注敬鵬企业号'));
                            break;
                    }
                }
                else if (result.MsgType.toLowerCase() === "text") {
                    res.send(msg.txtMsg(fromUser, toUser, 'Hello ！這是來自敬鵬微信企业號的訊息'));
                    var post_data = JSON.parse(JSON.stringify('{"touser": "' + fromUser + '", "msgtype": "text", "agentid": 1000002,"text" : {"content" : "' + result.Content + '"},"safe": 0}'));
                    console.log(JSON.stringify(post_data));

                    getAccessToken().then(function (data) {
                        postMsg(accessTokenJson.directory.access_token, post_data);
                    });
                }
                else {
                    //打印错误信息
                    console.log(err);
                }
            }
        })
    });
}

//回复文本消息
function txtMsg(toUser, fromUser, content) {
    var xmlContent = "<xml><ToUserName><![CDATA[" + toUser + "]]></ToUserName>";
    xmlContent += "<FromUserName><![CDATA[" + fromUser + "]]></FromUserName>";
    xmlContent += "<CreateTime>" + new Date().getTime() + "</CreateTime>";
    xmlContent += "<MsgType><![CDATA[text]]></MsgType>";
    xmlContent += "<Content><![CDATA[" + content + "]]></Content></xml>";
    return xmlContent;
}

//https get
function requestGet(url) {
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

//https post
function postMsg(access_token, post_data) {
    return new Promise(function (resolve, reject) {
        // Build the post string from an object
        // post_data = JSON.parse(JSON.stringify('{"touser": "A0012272", "msgtype": "text", "agentid": 1000002,"text" : {"content" : "TEST消息發送(繁體)\n123456."},"safe": 0}'));
        // An object of options to indicate where to post to
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
            res.charset = 'utf-8';
            res.on('data', function (chunk) {
                console.log('Response: ' + chunk);
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();
    });
}

/**
 * 取得應用的access_token
 */
function getAccessToken() {
    return new Promise(function (resolve, reject) {
        // 當前時間
        var currentTime = new Date().getTime();
        // 格式化URL
        var url = util.format(config.ApiURL.accessTokenApi, process.env.corpId, process.env.agentSecret1000002);
        //console.log("url=" + url);
        // 判斷accessToken.json是否還有效
        // 無效時
        if (accessTokenJson.directory.access_token === "" || accessTokenJson.directory.expires_time < currentTime) {
            requestGet(url).then(function (data) {
                //console.log("requestGetdata=" + data);
                var result = JSON.parse(data);
                //
                if (result.errcode == "0") {
                    accessTokenJson.directory.access_token = result.access_token;
                    accessTokenJson.directory.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    // update accessToken.json
                    fs.writeFile('./accessToken.json', JSON.stringify(accessTokenJson));
                    console.log("update accessToken:" + JSON.stringify(accessTokenJson));
                    // return access_token 
                    resolve(accessTokenJson.directory.access_token);
                } else {
                    // return error msg
                    console.log("error, errcode=" + result.errcode);
                    resolve(result);
                }
            });
        // 有效時
        } else {
            // return access_token 
            // console.log("AccessToken exist:" + JSON.stringify(accessTokenJson.directory) + ",CurrentTime=" + currentTime);
            resolve(accessTokenJson.directory.access_token);
        }
    });
}

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

// 因為 express 預設走 port 3000，而 heroku 上預設卻不是，要透過下列程式轉換
var server = app.listen(process.env.PORT || 443, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});