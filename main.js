const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const port = 9000;
const path = require('path');
const mysql = require('mysql');
const querystring = require('querystring');
const https = require('https');
const request = require("request")
const striptags = require('striptags');
const sqlinjection = require('sql-injection');


const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: null,
    database: 'sms'
});
con.connect();
app.use(sqlinjection); 
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use("/css", express.static(__dirname + '/public'));
var client_id = "xxx";
var secret_id = "xx";
var token = new Buffer(client_id + ":" + secret_id).toString('base64');
console.log("Token : " + token);

app.get('/', (req, res) => {
    let sql = "select * from log";
    con.query(sql, (err, result, fields) => {
        res.render('index', {data: result, judul: "SMS Broadcast"});
    });
});
app.post('/', (req, res) => {
    let sendto = req.body.penerima,
            message = striptags(req.body.isi);
            
    var postData = querystring.stringify({
        'grant_type': 'client_credentials'
    });
    var options = {
        uri: 'https://api.mainapi.net/token',
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + token,
            'Content-Length': postData.length
        },
        body: postData
    };

    function callback(error, response, body) {
        var b = JSON.parse(body);
        if (typeof b.access_token != "undefined")
        {
            console.log("Token Success");
            var dataPost = querystring.stringify({
                msisdn: sendto,
                content: message
            });
            var ap = b.access_token;
            var sendoptions = {
                uri: 'https://api.mainapi.net/smsnotification/1.0.0/messages',
                method: 'POST',
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded",
                    'Authorization': 'Bearer ' + ap,
                    'Accept': 'application/json'
                },
                body: dataPost
            };

            function callsend(error, response, body) {
                console.log("Call Back Success");
                var resul = JSON.parse(body);
                if (resul.code == 1)
                {
                    var msg = "Send Success";
                } else {
                    var msg = "Send Failed";
                }
                console.log(resul);
                console.log(ap);
                console.log(message);
                let sql = "select * from log";
                con.query(sql, (err, result, fields) => {
                    res.render('index', {data: result,sendcode:{code:resul.code,msg:msg},judul: "SMS Broadcast"});
                });
            }
            request(sendoptions, callsend);
        } else {
            console.log("Token Failed");
        }

    }
    request(options, callback);

});
app.listen(port, () => {
    console.log("Run On Port : " + port);
});