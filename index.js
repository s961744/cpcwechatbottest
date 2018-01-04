const express = require('express'), // express �ج[ 
    crypto = require('crypto'), // �ޤJ�[�K��?
    WXBizMsgCrypt = require('wechat-crypto'), // �ޤJ�[�K��?
    config = require('./config'), // �ޤJ�t�m���
    accessTokenJson = require('./accessToken'), //�ޤJ���a�s?�� access_token
    http = require("http"),
    util = require('util');

var app = express();// ?��express�ج[

// �Τ_?�z�Ҧ�?�J�ݤf get ��?��?�D
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

//�Τ_?�z https Get?�D��k
this.requestGet = function (url) {
    return new Promise(function (resolve, reject) {
        https.get(url, function (res) {
            var buffer = [], result = "";
            //?�v data �ƥ�
            res.on('data', function (data) {
                buffer.push(data);
            });
            //?�v ?�u??�����ƥ�
            res.on('end', function () {
                result = Buffer.concat(buffer, buffer.length).toString('utf-8');
                //?�̦Z?�G��^
                resolve(result);
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
        console.log(url);
        //�P? ���a�s?�� access_token �O�_����
        if (accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime) {
            requestGet(url).then(function (data) {
                var result = JSON.parse(data);
                if (data.indexOf("errcode") < 0) {
                    accessTokenJson.access_token = result.access_token;
                    accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    //��s���a�s?��
                    fs.writeFile('./wechat/access_token.json', JSON.stringify(accessTokenJson));
                    //??���Z�� access_token ��^
                    resolve(accessTokenJson.access_token);
                } else {
                    //???��^
                    resolve(result);
                }
            });
        } else {
            //?���a�s?�� access_token ��^
            resolve(accessTokenJson.access_token);
        }
    });
}

// �]�� express �w�]�� port 3000�A�� heroku �W�w�]�o���O�A�n�z�L�U�C�{���ഫ
var server = app.listen(process.env.PORT || 443, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});