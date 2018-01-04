const express = require('express'), // express �ج[ 
    crypto = require('crypto'), // �ޤJ�[�K��?
    config = require('./config'); // �ޤJ�t�m���

var app = express();// ?��express�ج[

// �Τ_?�z�Ҧ�?�J 3000 �ݤf get ��?��?�D
app.get('/', function (req, res) {
    // 1.?���L�H�A?��Get?�D��?? signature�Btimestamp�Bnonce�Bechostr
    var signature = req.query.signature,// �L�H�[�K?�W
        timestamp = req.query.timestamp,// ??�W
        nonce = req.query.nonce,// ?��?
        echostr = req.query.echostr;// ?��r�Ŧ�

    // 2.?token�Btimestamp�Bnonce�T????��r��ǱƧ�
    var array = [config.token, timestamp, nonce];
    array.sort();

    // 3.?�T???�r�Ŧ�������@?�r�Ŧ�?��sha1�[�K
    var tempStr = array.join('');
    const hashCode = crypto.createHash('sha1'); // ?�إ[�K?�� 
    var resultCode = hashCode.update(tempStr, 'utf8').digest('hex'); // ??�J���r�Ŧ�?��[�K

    // 4.??��?�o�[�K�Z���r�Ŧ�i�Osignature?��A????�D?���_�L�H
    if (resultCode === signature) {
        res.send(echostr);
    } else {
        res.send('mismatch');
    }
 });

// ?�v3000�ݤf
app.listen(3000);

// �]�� express �w�]�� port 3000�A�� heroku �W�w�]�o���O�A�n�z�L�U�C�{���ഫ
var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});