const
    express = require('express'),
    WXBizMsgCrypt = require('wechat-crypto'),
    config = require('./config'),
    accessTokenJson = require('./accessToken'),
    https = require("https"),
    util = require('util'),
    fs = require('fs');

var app = express();

app.get('/', function (req, res) {
    var msg_signature = req.query.msg_signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var echostr = req.query.echostr;
    var cryptor = new WXBizMsgCrypt(process.env.token, process.env.encodingAESKey, process.env.corpId)
    var s = cryptor.decrypt(echostr);
    res.send(s.message);
    console.log("s.message=" + s.message);
    getAccessToken().then(function (data) {
        console.log("accessTokenJson=" + JSON.stringify(accessTokenJson));
        requestPost(accessTokenJson.directory.access_token);
    });


 });

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
function requestPost(access_token) {
    return new Promise(function (resolve, reject) {
        // Build the post string from an object
        var post_data = JSON.parse(JSON.stringify('{"touser": "A0012272", "msgtype": "text", "agentid": 1000002,"text" : {"content" : "TEST?��?�e\n123456."},"safe": 0}'));
        // An object of options to indicate where to post to
        var paraPost = '?access_token=' + access_token;
        var post_options = {
            host: 'qyapi.weixin.qq.com',
            port: '443',
            path: '/cgi-bin/message/send' + paraPost,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        // Set up the request
        var post_req = https.request(post_options, function (res) {
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
 * ���o����������access_token
 */
function getAccessToken() {
    return new Promise(function (resolve, reject) {
        // ��e�ɶ�
        var currentTime = new Date().getTime();
        // �榡��URL
        var url = util.format(config.ApiURL.accessTokenApi, process.env.corpId, process.env.agentSecret1000002);
        console.log("url=" + url);
        // �P�_accessToken.json�O�_�٦���
        // �L�Į�
        if (accessTokenJson.directory.access_token === "" || accessTokenJson.directory.expires_time < currentTime) {
            requestGet(url).then(function (data) {
                console.log("requestGetdata=" + data);
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
        // ���Į�
        } else {
            // return access_token 
            console.log("AccessToken exist:" + accessTokenJson.directory + ",CurrentTime=" + currentTime);
            resolve(accessTokenJson.directory.access_token);
        }
    });
}

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

// �]�� express �w�]�� port 3000�A�� heroku �W�w�]�o���O�A�n�z�L�U�C�{���ഫ
var server = app.listen(process.env.PORT || 443, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});