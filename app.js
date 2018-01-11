const express = require('express'), //express 框架 
      http = require("http"),
      wechat  = require('./wechat/wechat'), 
      config = require('./config');//引入配置文件
       
var app = express();//实例express框架

var wechatApp = new wechat(config); //实例wechat 模块

//用于处理所有进入 3000 端口 get 的连接请求
app.get('/',function(req,res){
    wechatApp.auth(req,res);
});

//用于处理所有进入 3000 端口 post 的连接请求
app.post('/',function(req,res){
    wechatApp.handleMsg(req,res);
});

//用于请求获取 access_token
app.get('/getAccessToken',function(req,res){
    wechatApp.getAccessToken().then(function(data){
        res.send(data);
    });    
});

// 因為 express 預設走 port 3000，而 heroku 上預設卻不是，要透過下列程式轉換
var server = app.listen(process.env.PORT || 443, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});


// 發訊息排程 1次/30sec (每分鐘的5秒及35秒)
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
                                    wechat.postMsg(post_data);
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
