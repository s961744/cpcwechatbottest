const express = require('express'), //express 框架 
    config = require('./config');//引入配置文件

var app = express();//?例express框架

//用于?理所有?入 3000 端口 get 的?接?求
app.get('/', function (req, res) {
    //1.?取微信服?器Get?求的?? signature、timestamp、nonce、echostr
    var signature = req.query.signature,//微信加密?名
        timestamp = req.query.timestamp,//??戳
        nonce = req.query.nonce,//?机?
        echostr = req.query.echostr;//?机字符串

    //2.?token、timestamp、nonce三????行字典序排序
    var array = [config.token, timestamp, nonce];
    array.sort();

    //4.??者?得加密后的字符串可与signature?比，????求?源于微信

        res.send(echostr);
    }
});

//?听3000端口
app.listen(3000);

// 因為 express 預設走 port 3000，而 heroku 上預設卻不是，要透過下列程式轉換
var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});