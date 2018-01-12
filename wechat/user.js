'use strict' // 嚴謹模式

const
    https = require('https'),
    util = require('util'),
    wechat = require('./wechat'),
    config = require('./config');

var wechatApp = new wechat(config); //实例wechat 模块

/**
 * 讀取成員
 * @param {String} access_token
 * @param {String} userid
 */
exports.getUser = function (access_token, userid) {
    // 設定PUT RESTful API連接參數
    var url = util.format(config.ApiURL.getUserAPI, access_token, userid);
    requestGet(url).then(function (data) {
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
