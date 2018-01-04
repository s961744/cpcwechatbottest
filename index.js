const express = require('express'), // express 琜 
    crypto = require('crypto'), // ま盞家?
    WXBizMsgCrypt = require('wechat-crypto'), // ま盞家?
    config = require('./config'), // ま皌竚ゅン
    accessTokenJson = require('./accessToken'), //まセ? access_token
    http = require("http"),
    util = require('util');

var app = express();// ?ㄒexpress琜

// ノ?瞶┮Τ?狠 get ?钡?―
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

//ノ?瞶 https Get?―よ猭
this.requestGet = function (url) {
    return new Promise(function (resolve, reject) {
        https.get(url, function (res) {
            var buffer = [], result = "";
            //? data ㄆン
            res.on('data', function (data) {
                buffer.push(data);
            });
            //? ?誹??ЧΘㄆン
            res.on('end', function () {
                result = Buffer.concat(buffer, buffer.length).toString('utf-8');
                //?程?狦
                resolve(result);
            });
        }).on('error', function (err) {
            reject(err);
        });
    });
}

/**
 * ?稬獺 access_token
 */
function getAccessToken() {
    return new Promise(function (resolve, reject) {
        //??玡?? 
        var currentTime = new Date().getTime();
        //Αて?―
        var url = util.format(config.accessTokenApiURL.accessTokenApi, config.corpId, config.corpSecret);
        console.log(url);
        //? セ? access_token 琌Τ
        if (accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime) {
            requestGet(url).then(function (data) {
                var result = JSON.parse(data);
                if (data.indexOf("errcode") < 0) {
                    accessTokenJson.access_token = result.access_token;
                    accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    //穝セ?
                    fs.writeFile('./wechat/access_token.json', JSON.stringify(accessTokenJson));
                    //?? access_token 
                    resolve(accessTokenJson.access_token);
                } else {
                    //???
                    resolve(result);
                }
            });
        } else {
            //?セ? access_token 
            resolve(accessTokenJson.access_token);
        }
    });
}

//  express 箇砞ǐ port 3000τ heroku 箇砞玱ぃ琌璶硓筁祘Α锣传
var server = app.listen(process.env.PORT || 443, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});