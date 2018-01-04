const express = require('express'), // express 琜 
    crypto = require('crypto'), // ま盞家?
    WXBizMsgCrypt = require('wechat-crypto'), // ま盞家?
    config = require('./config'); // ま皌竚ゅン

var app = express();// ?ㄒexpress琜

// ノ?瞶┮Τ?狠 get ?钡?―
app.get('/', function (req, res) {
    // 1.?稬獺狝?竟Get?―?? signaturetimestampnonceechostr
    //var signature = req.query.msg_signature,// 稬獺盞?
    //    timestamp = req.query.timestamp,// ??耊
    //    nonce = req.query.nonce,// ?审?
    //    echostr = req.query.echostr;// ?审才﹃

    //// 2.?tokentimestampnonce????︽ㄥ逼
    //var array = [config.token, timestamp, nonce];
    //array.sort();

    //// 3.????才﹃钡Θ?才﹃?︽sha1盞
    //var tempStr = array.join('');
    //const hashCode = crypto.createHash('sha1'); // ?盞? 
    //var resultCode = hashCode.update(tempStr, 'utf8').digest('hex'); // ??才﹃?︽盞

    //// 4.???眔盞才﹃蒓signature?ゑ????―?方稬獺
    //if (resultCode === signature) {
    //    res.send(echostr);
    //} else {
    //    res.send("resultCode=" + resultCode + ",signature=" + signature +
    //        ",config.token=" + config.token + ",timestamp=" + timestamp +
    //        ",nonce=" + nonce + ",echostr=" + echostr);
    //}
    //res.send("123456789");
    var msg_signature = req.query.msg_signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var echostr = req.query.echostr;
    var cryptor = new WXBizMsgCrypt(config.token, config.encodingAESKey, config.corpId)
    var s = cryptor.decrypt(echostr);
    res.send(s.message);
 });

//  express 箇砞ǐ port 3000τ heroku 箇砞玱ぃ琌璶硓筁祘Α锣传
var server = app.listen(process.env.PORT || 443, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});