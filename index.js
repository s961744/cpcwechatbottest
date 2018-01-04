const express = require('express'), // express �ج[ 
    crypto = require('crypto'), // �ޤJ�[�K��?
    WXBizMsgCrypt = require('wechat-crypto'), // �ޤJ�[�K��?
    config = require('./config'), // �ޤJ�t�m���
    accessTokenJson = require('./accessToken'), //�ޤJ���a�s?�� access_token
    https = require("https"),
    util = require('util'),
    fs = require('fs');

var app = express();// ?��express�ج[

// �Τ_?�z�Ҧ�?�J�ݤf get ��?��?�D
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
            //?�v data �ƥ�
            res.on('data', function (chunk) {
                chunks.push(chunk);
                size += chunk.length;
            });
            //?�v ?�u??�����ƥ�
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
 * ?���L�H access_token
 */
function getAccessToken() {
    return new Promise(function (resolve, reject) {
        //?��?�e?? 
        var currentTime = new Date().getTime();
        //�榡��?�D�a�}
        var url = util.format(config.accessTokenApiURL.accessTokenApi, config.corpId, config.corpSecret);
        console.log("url=" + url);
        //�P? ���a�s?�� access_token �O�_����
        if (accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime) {
            requestGet(url).then(function (data) {
                console.log("requestGetdata=" + data);
                var result = JSON.parse(data);
                if (result.errcode == "0") {
                    accessTokenJson.access_token = result.access_token;
                    accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    //��s���a�s?��
                    fs.writeFile('./accessToken.json', JSON.stringify(accessTokenJson));
                    console.log("update accessToken:" + JSON.stringify(accessTokenJson));
                    //??���Z�� access_token ��^
                    resolve(accessTokenJson.access_token);
                } else {
                    //???��^
                    console.log("error, errcode=" + result.errcode);
                    resolve(result);
                }
            });
        } else {
            //?���a�s?�� access_token ��^
            console.log("AccessToken exist:" + accessTokenJson.access_token);
            resolve(accessTokenJson.access_token);
            
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