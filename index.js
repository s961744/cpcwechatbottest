const express = require('express'), // express 框架 
    crypto = require('crypto'), // 引入加密模?
    WXBizMsgCrypt = require('wechat-crypto'), // 引入加密模?
    config = require('./config'), // 引入配置文件
    accessTokenJson = require('./accessToken'), //引入本地存?的 access_token
    https = require("https"),
    util = require('util'),
    fs = require('fs');

var app = express();// ?例express框架

// 用于?理所有?入端口 get 的?接?求
app.get('/', function (req, res) {
    var msg_signature = req.query.msg_signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var echostr = req.query.echostr;
    var cryptor = new WXBizMsgCrypt(config.token, config.encodingAESKey, config.corpId)
    var s = cryptor.decrypt(echostr);
    res.send(s.message);

    getAccessToken().then(function (data) {
        console.log("accessTokenJson=" + JSON.stringify(accessTokenJson));
    });
 });

//https get
function requestGet(url) {
    return new Promise(function (resolve, reject) {
        https.get(url, function (res) {
            var chunks = [], result = "", size = 0;
            //?听 data 事件
            res.on('data', function (chunk) {
                chunks.push(chunk);
                size += chunk.length;
            });
            //?听 ?据??完成事件
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
 * ?取微信 access_token
 */
function getAccessToken() {
    return new Promise(function (resolve, reject) {
        //?取?前?? 
        var currentTime = new Date().getTime();
        //格式化?求地址
        var url = util.format(config.accessTokenApiURL.accessTokenApi, config.corpId, config.corpSecret);
        console.log("url=" + url);
        //判? 本地存?的 access_token 是否有效
        if (accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime) {
            requestGet(url).then(function (data) {
                console.log("requestGetdata=" + data);
                var result = JSON.parse(data);
                if (result.errcode == "0") {
                    accessTokenJson.access_token = result.access_token;
                    accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    //更新本地存?的
                    fs.writeFile('./accessToken.json', JSON.stringify(accessTokenJson));
                    console.log("update accessToken:" + JSON.stringify(accessTokenJson));
                    //??取后的 access_token 返回
                    resolve(accessTokenJson.access_token);
                } else {
                    //???返回
                    console.log("error, errcode=" + result.errcode);
                    resolve(result);
                }
            });
        } else {
            //?本地存?的 access_token 返回
            console.log("AccessToken exist:" + accessTokenJson.access_token);
            resolve(accessTokenJson.access_token);
            
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