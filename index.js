const express = require('express'), // express 框架 
    crypto = require('crypto'), // 引入加密模?
    WXBizMsgCrypt = require('wechat-crypto'), // 引入加密模?
    config = require('./config'), // 引入配置文件
    accessTokenJson = require('./accessToken'), //引入本地存?的 access_token
    http = require("http"),
    util = require('util');

var app = express();// ?例express框架

// 用于?理所有?入端口 get 的?接?求
app.get('/', function (req, res) {
    var msg_signature = req.query.msg_signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var echostr = req.query.echostr;
    var cryptor = new WXBizMsgCrypt(config.token, config.encodingAESKey, config.corpId)
    var s = cryptor.decrypt(echostr);
    //res.send(s.message);

    getAccessToken().then(function (data) {
        res.send(data);
    });
 });

//用于?理 https Get?求方法
function requestGet(url) {
    return new Promise(function (resolve, reject) {
        https.get(url, function (res) {
            var buffer = [], result = "";
            //?听 data 事件
            res.on('data', function (data) {
                buffer.push(data);
            });
            //?听 ?据??完成事件
            res.on('end', function () {
                result = Buffer.concat(buffer, buffer.length).toString('utf-8');
                //?最后?果返回
                resolve(result);
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
        console.log(url);
        //判? 本地存?的 access_token 是否有效
        if (accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime) {
            requestGet(url).then(function (data) {
                var result = JSON.parse(data);
                if (data.indexOf("errcode") < 0) {
                    accessTokenJson.access_token = result.access_token;
                    accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    //更新本地存?的
                    fs.writeFile('./wechat/access_token.json', JSON.stringify(accessTokenJson));
                    //??取后的 access_token 返回
                    resolve(accessTokenJson.access_token);
                } else {
                    //???返回
                    resolve(result);
                }
            });
        } else {
            //?本地存?的 access_token 返回
            resolve(accessTokenJson.access_token);
        }
    });
}

// 因為 express 預設走 port 3000，而 heroku 上預設卻不是，要透過下列程式轉換
var server = app.listen(process.env.PORT || 443, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});