'use strict' // 嚴謹模式

const
    http = require('./../http'),
    util = require('util');
/**
 * 取得媒體內容
 * @param {String} access_token
 * @param {String} userid
 */
exports.getMediaContent = function (accessToken, mediaId) {  
    return new Promise(function (resolve, reject) {
        // 設定PUT RESTful API連接參數
        var url = util.format(process.env.API_getMedia, accessToken, mediaId);
        http.requestHttpsGet(url).then(function (data) {
            // save file to Server
            var now = new Date().toISOString().
                replace(/T/, ' ').replace(/\..+/, '').replace(/-/g, '').replace(/:/g, '').replace(/\s+/g, "");
            var random = Math.floor(Math.random() * 9999) + 1;
            var FileName = now + random + ".png";
            console.log(FileName);
            var optionsPost = {
                host: '116.50.39.201',
                port: 7102,
                path: '/FileRESTful/resources/FileRESTful/postFile/WechatImg/' + FileName,
                method: 'POST',
                encoding: null
            };
            try {
                var post_req = http.request(optionsPost, function (res) {
                    res.on('data', function (chunk) {
                        //var jdata = JSON.parse(chunk);
                        //jdata.forEach(function (row) {
                        //    var ReturnMsg = row.ReturnMsg;
                        //    var Directory = row.Directory;
                        //    console.log(ReturnMsg);
                        //    console.log(Directory);
                        //});
                        console.log("圖片上傳結果：" + chunk);
                        client.pushMessage(event.source.userId, { type: 'text', text: '圖片上傳成功!' });
                    });
                });

                // post the data
                post_req.write(data);
                post_req.end();

            }
            catch (e) {
                return console.log("http request fail:" + JSON.stringify(optionsPost) + "," + e);
            }
        });
        
    });
}