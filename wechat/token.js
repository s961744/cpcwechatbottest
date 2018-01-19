'use strict' // 嚴謹模式

const
    fs = require('fs'), // file system
    accessTokenJson = require('./access_token'); // access_token.json

/**
 * 回復文字訊息
 * @param {String} toUser 接收端
 * @param {String} fromUser 發送端
 * @param {String}  content 訊息內容
 */
exports.getAccessToken = function (secretType, secret){
    return new Promise(function (resolve, reject) {
        // 目前時間
        var currentTime = new Date().getTime();
        // 格式化URL
        var url = util.format(process.env.API_getAccessToken, process.env.corpId, secret);
        // 判斷accessToken是否還有效
        // 已過期時重取
        //console.log("url=" + url + ",secretType=" + secretType);
        switch (secretType) {
            case 'directory':
                if (accessTokenJson.directory.access_token === "" || accessTokenJson.directory.expires_time < currentTime) {
                    requestGet(url).then(function (data) {
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
                    requestGet(url).then(function (data) {
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

