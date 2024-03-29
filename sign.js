var request = require('request');
var fs = require('fs');
var crypto = require("crypto");
var path = require('path');
var commander = require('commander');

var regBase = 'http://registry.hubinga.com';
var burrowBase = "http://burrow.hubinga.com";

// this was all written just enough to make it work minimally, expecting it to get updates as it's used more :)

var keyFile = process.argv[2];
var namever = process.argv[3];
if(!keyFile || !path.existsSync(keyFile)) return error("missing private key file first argument "+keyFile);
var idKey = fs.readFileSync(keyFile,'utf8');

if(!namever || namever.indexOf('@') == -1) return error("invalid or missing name@ver second argument");
var name = namever.substr(0,namever.indexOf('@'));
var ver = namever.substr(namever.indexOf('@')+1);

// fetch the shasum/tarball data to sign
var url = regBase+'/'+name+'/'+ver;
request.get({uri:url, json:true}, function(err, resp, pkg){
    if(err || !pkg || !pkg.dist) return error("can't find in the registry at "+url);
    var js = {};
    var data = pkg.dist.shasum + ' ' + path.basename(pkg.dist.tarball);
    js.sig = sign(data);
    if(!js.sig) return error("signing failed");
    console.log("signed "+data);
    commander.password("user:password for registry: ", "*", function(up){
        var auth = (new Buffer(up,"ascii").toString("base64"));
        upload(name, 'signature-'+ver, JSON.stringify(js), auth, function(e, res, body){
            if(e) return error(e);
            if(res.statusCode != 200 && res.statusCode != 201) return error("upload:"+res.statusCode);
            // set the latest version signed
            var url = burrowBase+'/registry/'+name;
            request.get({uri:url, json:true}, function(err, resp, pkg){
                if(err || !pkg || !pkg._rev) return error("can't find in the registry at "+url);
                pkg.signed_ver = ver;
                pkg["dist-tags"].signed = ver;
                request.put({uri:url, headers:{"Content-Type":"application/json", Authorization:"Basic " + auth}, json:pkg}, function(e, res, body){
                    if(e) return error(e);
                    if(res.statusCode != 200 && res.statusCode != 201) return error("put: "+res.statusCode+" "+JSON.stringify(body));
                    console.log("signed and delivered! Go close the issue :)");
                    process.exit(0);
                })
            });
        });
    });
});

function error(msg)
{
    console.error("Error: ");
    console.error(msg);
    process.exit(1);
}

function sign(data) {
    var signer = crypto.createSign("RSA-SHA256");
    signer.update(data, "utf8");
    return signer.sign(idKey, 'base64');
}

function upload(id, name, data, auth, cb)
{
    request.get({uri:burrowBase + "/registry/" + id, json:true}, function(err, result, body) {
        if (err || !body || !body._rev) return cb("failed to get rev: "+body);
        var uri = burrowBase + "/registry/" + id + "/" + name + "?rev=" + body._rev;
        request.put({uri:uri, headers:{"Content-Type":"application/json", Authorization:"Basic " + auth}, body:data}, cb);
    });
}