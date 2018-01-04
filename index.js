const express = require('express'), //express �ج[ 
    config = require('./config');//�ޤJ�t�m���

var app = express();//?��express�ج[

//�Τ_?�z�Ҧ�?�J 3000 �ݤf get ��?��?�D
app.get('/', function (req, res) {
    //1.?���L�H�A?��Get?�D��?? signature�Btimestamp�Bnonce�Bechostr
    var signature = req.query.signature,//�L�H�[�K?�W
        timestamp = req.query.timestamp,//??�W
        nonce = req.query.nonce,//?��?
        echostr = req.query.echostr;//?��r�Ŧ�

    //2.?token�Btimestamp�Bnonce�T????��r��ǱƧ�
    var array = [config.token, timestamp, nonce];
    array.sort();

    //4.??��?�o�[�K�Z���r�Ŧ�i�Osignature?��A????�D?���_�L�H

        res.send(echostr);
    }
});

//?�v3000�ݤf
app.listen(3000);

// �]�� express �w�]�� port 3000�A�� heroku �W�w�]�o���O�A�n�z�L�U�C�{���ഫ
var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
});