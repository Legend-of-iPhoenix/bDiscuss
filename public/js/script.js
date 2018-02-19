var ui, uiConfig, refChildCounter, counter = 1,
    userFlag = false,
    userName = " ",
    mod = "",
    isUser = false;
var val, childData, userRef;
var objDiv, scroll, tippyText = "";
var dID, globalID, delMsg, msgID;

var productionMode = false;

//this code disables the console in production mode, so that our debug messages don't affect user experience. It's a really clever script, and I'm really proud of it. - _iPhoenix_
productionMode&&(()=>{x=console,window.console={},void Object.keys(x).forEach(function(o){window.console[o]=(()=>{})})})();

//save yourself an unnecessary, one-use global variable.
firebase.initializeApp({
    apiKey: "AIzaSyCI8N2f4HGdG7KVtjoea-g4eCkxvQhLOQw",
    authDomain: "tibd-discuss-beta.firebaseapp.com",
    databaseURL: "https://tibd-discuss-beta.firebaseio.com",
    projectId: "tibd-discuss-beta",
    storageBucket: "tibd-discuss-beta.appspot.com",
    messagingSenderId: "617814984936"
});

//firebase authentication & database
var auth = firebase.auth(),
    database = firebase.database();
//config the firebase app
uiConfig = {
    signInFlow: 'popup',
    'callbacks': {
        'signInSuccess': function () {
            location.reload();
        }
    },
    signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID
    ],
    tosUrl: '<tos_link>'
};

//initialize firebaseui
ui = new firebaseui.auth.AuthUI(firebase.auth());
ui.disableAutoSignIn();

var userSignedIn = function (user) {
    console.log("User signed in");
    document.getElementById("userSignedOut").style.display = 'none';
    document.getElementById("userSignedIn").style.display = 'block';
    userFlag = true;
}

var userSignedOut = function () {
    console.log("User signed out");
    document.getElementById("userSignedIn").style.display = 'none';
    document.getElementById("userSignedOut").style.display = 'block';
    ui.start('#firebaseui-auth-container', uiConfig);
}

//listen for auth changes
auth.onAuthStateChanged(function (user) {
    user ? userSignedIn(user) : userSignedOut();
    if (user) {
        console.log(user.displayName);
        console.log("Called from AuthStateChanged");
        userName = auth.currentUser.displayName;
        initUser();
    }
});
var messageRef = database.ref('messages');
var msgRef = database.ref('global/total');

var messageInput = document.getElementById('messageInput');
var send = function () {

    if (!isBanned) {
        var message = messageInput.value;
        if (message != "") {
            msgRef.transaction(function (currentData) {
                console.log("msgID Transaction:" + msgID); // you don't need the .toString() because JS is loosely typed and converts it to a string implicitly.

                return currentData + 1;
            }, function (error, committed, snapshot) {
                if (error) {
                    console.log('Transaction failed abnormally!', error);
                } else if (!committed) {
                    console.log('Aborted the transaction (because ' + userName + ' already exists).');
                } // why was there an empty else statement here?
            }, false);
            msgRef.on('value', function (data) {
                msgID = data.val();
                console.log("msgRef value updated:" + msgID);
            });
            console.log(message);
            database.ref('messages/'+msgID).set({
                'un': auth.currentUser.displayName,
                'msg': message,
                'ts': firebase.database.ServerValue.TIMESTAMP
            });
        }
        messageInput.value = '';
        postRef.transaction(function (currentData) {
            return currentData + 1;
        });
    }
}
//sendMessage is a button, can also use an onclick event
document.getElementById('sendMessage').addEventListener('click', send);
document.getElementById('signOut').addEventListener('click', function () {
    auth.signOut();
    location.reload();
});
messageRef.once('value', function () {
    objDiv = document.getElementById("messages");
    objDiv.scrollTop = objDiv.scrollHeight;
});

$(function () {
    $("#messageInput").keypress(function (e) {
        if (e.which == 13) {
            send();
        }
    });
    $('.msg').linkify();
    $('#messages').on('scroll', function () {
        if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
            scroll = true;
        } else {
            scroll = false;
        }
    });
    tippy('.btn');
    tippy('.remove');
    tippy('.hammer');
});
/* $(document).ready(function () {
    $('.admin.remove').click(function (event) {
        dID = parseInt(event.target.id);
        messageRef.transaction(function (currentData) {
            console.log(currentData.val());
        });
        console.log(messageRef.orderByChild('id').equalTo(dID));
    });
}) */

function scrollToBottom() {
    $('#messages').scrollTop($('#messages')[0].scrollHeight);
}

var initProfile = function () {

}

function dropHammer(username) {

}

var deleteMsg = function (id) {
    dID = parseInt(id);

    database.ref('global/deleteID').transaction(function (currentData) {
        globalID = dID;
        console.log("dID Value: " + globalID);
        return dID;
    }, function (error, committed, snapshot) {
        if (error) {
            console.log('Transaction failed abnormally!', error);
        } else if (!committed) {
            console.log('globalID not updated');
        } else {

        }
    }, false);

    firebase.database().ref('messages/'+dID).remove();
}

// Shamelessly ripped from UniChat by _iPhoenix_, to prevent XSS.
function cleanse(message) {
  var n = document.createElement("DIV");
  n.innerText = message;
  return n.innerHTML;
}

var initUser = function () {
    userRef = firebase.database().ref('userState/' + userName);
    postRef = firebase.database().ref('userState/' + userName + '/posts');
    msgRef.transaction(function (currentData) {
        msgID = currentData;
        return currentData;
    }, function (error, committed, snapshot) {
        if (error) {
            console.log('Transaction failed abnormally!', error);
        } else if (!committed) {
            console.log('msgID not updated');
        } else {
            console.log('User' + userName + ' added!');
        }
    });
    //firebase.database().ref('/mods/').on('')
    userRef.transaction(function (currentData) {
        if (currentData === null) {
            return {
                isBanned: false,
                posts: 0
            };
        } else {
            console.log('User ' + userName + ' already exists.');
            return;
        }
    }, function (error, committed, snapshot) {
        if (error) {
            console.log('Transaction failed abnormally!', error);
        } else if (!committed) {
            console.log('Aborted the transaction (because ' + userName + ' already exists).');
        } else {
            console.log('User' + userName + ' added!');
        }
        console.log(userName + "'s data: ", snapshot.val());
        isMod = firebase.database().ref("/mods/").once('value').then(x=>-1!=(x.val().indexOf(firebase.auth().currentUser.displayName)));
        isBanned = snapshot.val().isBanned;
        messageRef.orderByChild('ts').limitToLast(30).on('child_added', function (data) {
            var val = data.val();
            val.id = data.key;
            console.log(val)
            // I don't like this script. It makes it hard to record important conversations. I'm commenting it out, but feel free to add it back in.
            /*
            if (counter > 29) {
                $('#' + (counter - 30)).remove();
            }
            */
            $('#messages').append("<div class='msg' id=" + val.id + ">" + "<span class='timestamp'>" + new Date(val.ts).toLocaleTimeString() + "</span> <strong id='user" + val.id + "' class='user" + val.id + "' title='"+val.un+"'>" + val.un + "</strong>: " + cleanse(val.msg));
            firebase.database().ref("/mods/").once('value').then(x=>$('#user' + val.id).prepend((1+x.val().indexOf(val.un))?"<span class='mod'>MOD</span>":""))
            if (isMod) {
                $('#' + (val.id)).append("<a class='admin remove' title='Delete' id=" + val.id + " onclick='deleteMsg(\""+val.id+"\")'><i class='fas fa-times'></i></a><a class='admin hammer' title='Ban' onclick='dropHammer("+val.un+");'><i class='fas fa-gavel'></i></a>");
            }
            $('.msg').linkify();
            tippy('.admin');
            tippy(".user" + val.id);
            counter++;
            if (scroll) {
                objDiv = document.getElementById("messages");
                objDiv.scrollTop = objDiv.scrollHeight;
            }
        });
        messageRef.on('child_removed', function (data) {
            database.ref('global/deleteID').transaction(function (currentData) {
                globalID = currentData;
                console.log("dID Value: " + globalID);
                return dID;
            });
            console.log(globalID);
            delMsg = document.getElementById(globalID);
            delMsg.parentNode.removeChild(delMsg);
        });

        database.ref('global/deleteID').on("value", function (snapshot) {
            snapshot.forEach(function (child) {
                console.log(child.key + ": " + child.val());
            });
        });
    });
}
/* var _0x4ad8=['fBobwpQUw5nCvcKAwqQjdcOKw5zDoQ==','wrdww6E/wrw=','w5E6woQvwrFzw5A=','wo1XMcKsITFZwrVocjcoCEs=','acOkw7fDnMK9HT1Rwq9Sw6cfw7A=','w40GB8K2QQ==','HcKFw67Dnn0rwo4fNTNzLWvCmUDCpMOMwpM=','KRdVf2lYF8Oxf8OLw47Cv8OISQ==','w4Mywpsqwrg=','wrZhw74=','H1LDqyhmalPCpxQ=','w44HDcKy','KFNFRWoHw5M1RjYG','XiDDkMOSOsO9w44Yw4vDosKp','RG4AD0w=','AcKIw53DhGUvwokEJA==','wrXDt8Onwq5iIWggRsOEWMOM','wpQkO1rDscOawofDuDzCtcO4w57DocO+','w6c4NQUFw6Zvwo3Dv8K+Cw==','wqQjwoleQ8KIIMOiw5NIAMOawqjCqMODw54=','woleLMKKJg==','EMK5MTlkw4c4bz1Ww6NJEsOY','woLCtsO+w4jDrRBo','w70hE8OjKVRTw4UVwqbDncKcUDPChHs=','wo7ClAEYw4I=','PRtGVEpIDg==','JsOfLcK+J8Kd','YsOGUg==','w7EgBMOVPlZYw4I=','wqp7QV3DgA==','XHoBOUE5wqVESmlP','HsKEw4g=','wrshwrUzw5nCgcOuw55bTcOF','wpvCmQQ=','wqh1flzDl8KQwqxV','bsOyw7/DgcKYEQ==','M8OOUcOKw49JwqLDvsKA','w7UuPFXDvsKq','JxsGwqdYw5/CvMKEwrkkCsKUw7jDtsOkLAvCg3Fs','wocuHGvDr8OWwoTDug==','wqjDtcO4wqQ=','w5g2woQswrx1w4w=','wo08PCxiRV8K','dAnDjCVwSQ==','w5HDlMKUwqRWd8K2XcKY','M0INwr1jw70=','w61Bw7TCqHPCvC7DjA==','wpfDoQLDrQ==','dhocwqIZw5vCtQ==','bR9ESXZcHcOxWMORw7zCs8O1','USzDmsOSJMO5w4Ql','PE5eVGc=','PQZTU2ta','w7cyNRI8w7Fpwp3DqsK2HA==','AMK0LBBtwoJ9fiFXw4QZe8OHdA==','wpjDsB/DpMKt','c8OMQcOXw4hNwrc=','w7g4NQY8w6s=','Oj8rdCc6DAVuKsKS','wqLDscO3wrQ=','PjcgdQ==','wobCrMKUw7Q=','Wz3CpsK5fBo=','wpo8AStkXkQOwrrClsOC','DiLDtWI=','wr1qXUTDnA==','dRjDgD5jYzs3wplOXw==','wp8mATtkRV4Dw67Dk8Osw5cSw5nDnVc=','w6zDjkxBFmLDnMOSw7AfCMKuQcKnYjNGasK7wpMSQD/CpcKqVlhfNztdH8KVEcK3VnDDlcK3w43Do0fCqsKFIcKHCTRAw6zCisKPccKAYgpvwonCtcKywpQA','w7DCl8KPMQ==','aMOyw6HDmg==','w4ICwrkRwqo=','BlLDqy8=','wq/DusOlwrR6','wozCiBgXw5A=','woEkO2rDr8ORw4rCtTTCtMOUw4TDnMOzWMKTFGl3','QDPCj37DncOrwr9JwpDDr8OKKcOoVGsDC8KBdT0ZIg5MwrJ7OixIw5DDg3I=','wqXDu8O7wrJhIUU=','OcOmw5Vq','wp3DpQ3DvcKz','w4gEwr4X','wo7CnkQOw5Q=','XjbDgnjDgsOxwqVSwow=','UWACCUY8wqw=','f8O4w7zDncKBGD8=','wobCvsOrw4g=','w6FVQcO6w7Quwqo=','wpo8ASt/QFQ=','PcKfEhg=','w7pBw4nCr27CuSU=','RsKaBMOnBw==','WCHDj27DncOpwqk=','EsKkJhl4w5Y8ZT0=','wobCosKWw6vCusOaMQ==','LSIkZDY=','wp/ChVQFwotxeUjDl8KnektEecKbZ8K9w57Cn8K2L8OywpBewooICSHCpEbCj04M','PMOONcKhNcODWsOnwr8aw6LCgcKhwrnDksKIwpxgwpDDmS5Hw7nCrMO+fsKJB8KzTsOVBMKjw63CpMKhHsKlw7os','TyfDg3nCn8OhwqVOwoHDr8OaLsKqRCZVGMOKYDgbP15Xwq48KmEM','DHjClMKaZ8Kowo5uwp7CtsO/woo=','wq1qw7EnwrBBLsO2QUd9w6nDgA==','wqx1XV3DlQ==','AFLDtDRmaQ==','w7UrOFg=','E8KeGxDDn8KbAFxTHMO3wozDrsODBy3CkMOQ','TMOFw53DuMKnMB9twpV/w6w=','LwdVUg==','HhUJNQ==','Wgobwrktw7U=','wrY9wqwy','w71Hw5TCvWPCuSXDqnXDu8KmZmpMwqjCjsO1','woHClw8=','w4EuPhNow7B1wpnDsMK8CsK/ckI=','w77CnMKSABDDkMO6w7dwDjbCkh4M','UMKcD8OkEA==','GwkOLSRBCA==','w57Cin4P','wp7DpRvDjcK4AsKUwpjCpnDDizzDn8OU','B8KYw4rDmVoqwroFMSNfAA==','w7FOVsOlw74=','wqEuwp5rWcKMNw==','HzjChA==','woI7wr0owo3CpsOow7VUW8OVdsKvwpvCgQ=='];(function(_0x29b4fa,_0x33de89){var _0x10600b=function(_0x5b2212){while(--_0x5b2212){_0x29b4fa['push'](_0x29b4fa['shift']());}};var _0x20b8d5=function(){var _0x57f21b={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0x4873a4,_0x249bb9,_0x2a8dcd,_0x3a3cfa){_0x3a3cfa=_0x3a3cfa||{};var _0x2fc4d4=_0x249bb9+'='+_0x2a8dcd;var _0x1ceaf0=0x0;for(var _0x1ceaf0=0x0,_0x39f76e=_0x4873a4['length'];_0x1ceaf0<_0x39f76e;_0x1ceaf0++){var _0x263ce3=_0x4873a4[_0x1ceaf0];_0x2fc4d4+=';\x20'+_0x263ce3;var _0x3cfd19=_0x4873a4[_0x263ce3];_0x4873a4['push'](_0x3cfd19);_0x39f76e=_0x4873a4['length'];if(_0x3cfd19!==!![]){_0x2fc4d4+='='+_0x3cfd19;}}_0x3a3cfa['cookie']=_0x2fc4d4;},'removeCookie':function(){return'dev';},'getCookie':function(_0x30598b,_0x7898c9){_0x30598b=_0x30598b||function(_0x55882c){return _0x55882c;};var _0x9fad89=_0x30598b(new RegExp('(?:^|;\x20)'+_0x7898c9['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0xdd9e87=function(_0x5d67e5,_0xc8be0e){_0x5d67e5(++_0xc8be0e);};_0xdd9e87(_0x10600b,_0x33de89);return _0x9fad89?decodeURIComponent(_0x9fad89[0x1]):undefined;}};var _0x34e6d6=function(){var _0x55663a=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x55663a['test'](_0x57f21b['removeCookie']['toString']());};_0x57f21b['updateCookie']=_0x34e6d6;var _0x529b3f='';var _0x52d538=_0x57f21b['updateCookie']();if(!_0x52d538){_0x57f21b['setCookie'](['*'],'counter',0x1);}else if(_0x52d538){_0x529b3f=_0x57f21b['getCookie'](null,'counter');}else{_0x57f21b['removeCookie']();}};_0x20b8d5();}(_0x4ad8,0x1b1));var _0x3a26=function(_0x41d561,_0x3caf3b){_0x41d561=_0x41d561-0x0;var _0x16eebd=_0x4ad8[_0x41d561];if(_0x3a26['initialized']===undefined){(function(){var _0x1fa91e;try{var _0x205f80=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');');_0x1fa91e=_0x205f80();}catch(_0x22d313){_0x1fa91e=window;}var _0x51d86e='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x1fa91e['atob']||(_0x1fa91e['atob']=function(_0x7ffef){var _0x428d0d=String(_0x7ffef)['replace'](/=+$/,'');for(var _0x1e50d8=0x0,_0xb3d47e,_0xaf8d95,_0x26d176=0x0,_0x4a16b1='';_0xaf8d95=_0x428d0d['charAt'](_0x26d176++);~_0xaf8d95&&(_0xb3d47e=_0x1e50d8%0x4?_0xb3d47e*0x40+_0xaf8d95:_0xaf8d95,_0x1e50d8++%0x4)?_0x4a16b1+=String['fromCharCode'](0xff&_0xb3d47e>>(-0x2*_0x1e50d8&0x6)):0x0){_0xaf8d95=_0x51d86e['indexOf'](_0xaf8d95);}return _0x4a16b1;});}());var _0x579e09=function(_0x48a712,_0x441116){var _0x7a5786=[],_0x28b55d=0x0,_0x129d87,_0x14b32e='',_0x3a6884='';_0x48a712=atob(_0x48a712);for(var _0x2ae94d=0x0,_0x4461cb=_0x48a712['length'];_0x2ae94d<_0x4461cb;_0x2ae94d++){_0x3a6884+='%'+('00'+_0x48a712['charCodeAt'](_0x2ae94d)['toString'](0x10))['slice'](-0x2);}_0x48a712=decodeURIComponent(_0x3a6884);for(var _0x3167f5=0x0;_0x3167f5<0x100;_0x3167f5++){_0x7a5786[_0x3167f5]=_0x3167f5;}for(_0x3167f5=0x0;_0x3167f5<0x100;_0x3167f5++){_0x28b55d=(_0x28b55d+_0x7a5786[_0x3167f5]+_0x441116['charCodeAt'](_0x3167f5%_0x441116['length']))%0x100;_0x129d87=_0x7a5786[_0x3167f5];_0x7a5786[_0x3167f5]=_0x7a5786[_0x28b55d];_0x7a5786[_0x28b55d]=_0x129d87;}_0x3167f5=0x0;_0x28b55d=0x0;for(var _0x3244ef=0x0;_0x3244ef<_0x48a712['length'];_0x3244ef++){_0x3167f5=(_0x3167f5+0x1)%0x100;_0x28b55d=(_0x28b55d+_0x7a5786[_0x3167f5])%0x100;_0x129d87=_0x7a5786[_0x3167f5];_0x7a5786[_0x3167f5]=_0x7a5786[_0x28b55d];_0x7a5786[_0x28b55d]=_0x129d87;_0x14b32e+=String['fromCharCode'](_0x48a712['charCodeAt'](_0x3244ef)^_0x7a5786[(_0x7a5786[_0x3167f5]+_0x7a5786[_0x28b55d])%0x100]);}return _0x14b32e;};_0x3a26['rc4']=_0x579e09;_0x3a26['data']={};_0x3a26['initialized']=!![];}var _0x2eaec2=_0x3a26['data'][_0x41d561];if(_0x2eaec2===undefined){if(_0x3a26['once']===undefined){var _0x2b7a10=function(_0x4526ec){this['rc4Bytes']=_0x4526ec;this['states']=[0x1,0x0,0x0];this['newState']=function(){return'newState';};this['firstState']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['secondState']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x2b7a10['prototype']['checkState']=function(){var _0x182c5c=new RegExp(this['firstState']+this['secondState']);return this['runState'](_0x182c5c['test'](this['newState']['toString']())?--this['states'][0x1]:--this['states'][0x0]);};_0x2b7a10['prototype']['runState']=function(_0x4ad794){if(!Boolean(~_0x4ad794)){return _0x4ad794;}return this['getState'](this['rc4Bytes']);};_0x2b7a10['prototype']['getState']=function(_0x3dfe8c){for(var _0x9f1777=0x0,_0x3168cc=this['states']['length'];_0x9f1777<_0x3168cc;_0x9f1777++){this['states']['push'](Math['round'](Math['random']()));_0x3168cc=this['states']['length'];}return _0x3dfe8c(this['states'][0x0]);};new _0x2b7a10(_0x3a26)['checkState']();_0x3a26['once']=!![];}_0x16eebd=_0x3a26['rc4'](_0x16eebd,_0x3caf3b);_0x3a26['data'][_0x41d561]=_0x16eebd;}else{_0x16eebd=_0x2eaec2;}return _0x16eebd;};var _0x5efef6=function(){var _0x1dbea2=!![];return function(_0x11cac3,_0x3288a6){var _0x43802f=_0x1dbea2?function(){if(_0x3288a6){var _0x1fab7a=_0x3288a6['apply'](_0x11cac3,arguments);_0x3288a6=null;return _0x1fab7a;}}:function(){};_0x1dbea2=![];return _0x43802f;};}();var _0x404109=_0x5efef6(this,function(){var _0x1ad0d1=function(){return'\x64\x65\x76';},_0x3f974e=function(){return'\x77\x69\x6e\x64\x6f\x77';};var _0x45c553=function(){var _0x48222e=new RegExp('\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d');return!_0x48222e['\x74\x65\x73\x74'](_0x1ad0d1['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x303cd0=function(){var _0x2136f6=new RegExp('\x28\x5c\x5c\x5b\x78\x7c\x75\x5d\x28\x5c\x77\x29\x7b\x32\x2c\x34\x7d\x29\x2b');return _0x2136f6['\x74\x65\x73\x74'](_0x3f974e['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0xd67fc7=function(_0x570a67){var _0x10047a=~-0x1>>0x1+0xff%0x0;if(_0x570a67['\x69\x6e\x64\x65\x78\x4f\x66']('\x69'===_0x10047a)){_0x5904ff(_0x570a67);}};var _0x5904ff=function(_0x4a1bce){var _0x115a9e=~-0x4>>0x1+0xff%0x0;if(_0x4a1bce['\x69\x6e\x64\x65\x78\x4f\x66']((!![]+'')[0x3])!==_0x115a9e){_0xd67fc7(_0x4a1bce);}};if(!_0x45c553()){if(!_0x303cd0()){_0xd67fc7('\x69\x6e\x64\u0435\x78\x4f\x66');}else{_0xd67fc7('\x69\x6e\x64\x65\x78\x4f\x66');}}else{_0xd67fc7('\x69\x6e\x64\u0435\x78\x4f\x66');}});_0x404109();var _0x48d272=function(){var _0x239fa2=!![];return function(_0x4eaa2a,_0x590131){var _0x14eee6=_0x239fa2?function(){if(_0x590131){var _0x32c0c4=_0x590131['apply'](_0x4eaa2a,arguments);_0x590131=null;return _0x32c0c4;}}:function(){};_0x239fa2=![];return _0x14eee6;};}();(function(){_0x48d272(this,function(){var _0x171001=new RegExp(_0x3a26('0x0','3#EE'));var _0x2c6263=new RegExp(_0x3a26('0x1','tVPU'),'i');var _0x93fe0d=_0x713f94(_0x3a26('0x2','TZdv'));if(!_0x171001[_0x3a26('0x3','qH]l')](_0x93fe0d+_0x3a26('0x4','9KS6'))||!_0x2c6263[_0x3a26('0x5','bQ8k')](_0x93fe0d+_0x3a26('0x6','*tuB'))){_0x93fe0d('0');}else{_0x713f94();}})();}());var _0x4094c7=function(){var _0x5e147c=!![];return function(_0x15a50c,_0x1309e4){var _0xf47cd1=_0x5e147c?function(){if(_0x1309e4){var _0x4d3be7=_0x1309e4[_0x3a26('0x7','vAAb')](_0x15a50c,arguments);_0x1309e4=null;return _0x4d3be7;}}:function(){};_0x5e147c=![];return _0xf47cd1;};}();var _0x1cc066=_0x4094c7(this,function(){var _0x4f2e6f=function(){};var _0x4f0c60=function(){var _0x58ee2f;try{_0x58ee2f=Function(_0x3a26('0x8','uenb')+_0x3a26('0x9','vKUw')+');')();}catch(_0x5efa61){_0x58ee2f=window;}return _0x58ee2f;};var _0x585c22=_0x4f0c60();if(!_0x585c22['console']){_0x585c22[_0x3a26('0xa','*tuB')]=function(_0x1dfea5){var _0x809802={};_0x809802['log']=_0x1dfea5;_0x809802[_0x3a26('0xb','OB&f')]=_0x1dfea5;_0x809802[_0x3a26('0xc','Adcv')]=_0x1dfea5;_0x809802[_0x3a26('0xd','9KS6')]=_0x1dfea5;_0x809802[_0x3a26('0xe','LmSQ')]=_0x1dfea5;_0x809802[_0x3a26('0xf','vKUw')]=_0x1dfea5;_0x809802['trace']=_0x1dfea5;return _0x809802;}(_0x4f2e6f);}else{_0x585c22[_0x3a26('0x10','^o7h')]['log']=_0x4f2e6f;_0x585c22[_0x3a26('0x11','qH]l')][_0x3a26('0x12','sAtF')]=_0x4f2e6f;_0x585c22[_0x3a26('0x13','bZf2')]['debug']=_0x4f2e6f;_0x585c22[_0x3a26('0x14','3#EE')][_0x3a26('0x15','[10P')]=_0x4f2e6f;_0x585c22[_0x3a26('0x16','XNpT')][_0x3a26('0x17','j$))')]=_0x4f2e6f;_0x585c22[_0x3a26('0x18','vKUw')][_0x3a26('0x19','*DQV')]=_0x4f2e6f;_0x585c22[_0x3a26('0x1a','PUh^')][_0x3a26('0x1b','2ct8')]=_0x4f2e6f;}});_0x1cc066();var _0x560f56,_0x379641,_0x59c172,_0x230c34=0x0;var _0x5b9db3={'apiKey':'AIzaSyCI8N2f4HGdG7KVtjoea-g4eCkxvQhLOQw','authDomain':_0x3a26('0x1c','LmSQ'),'databaseURL':_0x3a26('0x1d','p3fH'),'projectId':'tibd-discuss-beta','storageBucket':_0x3a26('0x1e','vKUw'),'messagingSenderId':_0x3a26('0x1f','fVcd')};firebase[_0x3a26('0x20','Q#RK')](_0x5b9db3);_0x379641={'signInFlow':_0x3a26('0x21','&P@)'),'callbacks':{'signInSuccess':function(){location[_0x3a26('0x22','bQ8k')]();}},'signInOptions':[firebase[_0x3a26('0x23','X4tC')][_0x3a26('0x24','[10P')][_0x3a26('0x25','qH]l')]],'tosUrl':'<tos_link>'};var _0x17003c=firebase[_0x3a26('0x26','T)Z[')](),_0x2b1f2f=firebase['database']();_0x560f56=new firebaseui[(_0x3a26('0x27','kA3d'))][(_0x3a26('0x28','oMM)'))](firebase[_0x3a26('0x29','LfpM')]());_0x560f56[_0x3a26('0x2a','XNpT')]();var _0x4137bf=function(_0x5466ec){console[_0x3a26('0x2b','vAAb')](_0x3a26('0x2c','2)U0'));document[_0x3a26('0x2d','TZdv')]('userSignedOut')[_0x3a26('0x2e','j$))')][_0x3a26('0x2f','kA3d')]=_0x3a26('0x30','tVPU');document[_0x3a26('0x31','Adcv')](_0x3a26('0x32','kChc'))[_0x3a26('0x33','bZf2')][_0x3a26('0x34','lmfs')]='block';};var _0x1c5b4d=function(){console[_0x3a26('0x35','hA$&')](_0x3a26('0x36','LfpM'));document[_0x3a26('0x37','oMM)')]('userSignedIn')[_0x3a26('0x38','Q#RK')][_0x3a26('0x39','FYnu')]='none';document[_0x3a26('0x3a','6iBk')](_0x3a26('0x3b','qH]l'))[_0x3a26('0x3c','osUf')]['display']='block';_0x560f56['start']('#firebaseui-auth-container',_0x379641);};_0x17003c[_0x3a26('0x3d','kChc')](function(_0x1a43a4){_0x1a43a4?_0x4137bf(_0x1a43a4):_0x1c5b4d();});var _0x3b8ffc=document[_0x3a26('0x3e','T)Z[')]('messageInput');var _0x2f753c=function(){var _0x2a4062=_0x3b8ffc[_0x3a26('0x3f','FYnu')];if(_0x2a4062!=''){_0x2b1f2f[_0x3a26('0x40','Q#RK')](_0x3a26('0x41','bQ8k'))[_0x3a26('0x42','osUf')]({'name':_0x17003c[_0x3a26('0x43','wRZR')][_0x3a26('0x44','fVcd')],'linkedTo':_0x17003c[_0x3a26('0x43','wRZR')]['displayName'],'message':_0x2a4062});_0x3b8ffc[_0x3a26('0x45','^o7h')]='';var _0x7584e3=document['getElementById']('messages');_0x7584e3[_0x3a26('0x46','kChc')]=_0x7584e3[_0x3a26('0x47','*tuB')];}};document[_0x3a26('0x48','uenb')](_0x3a26('0x49','2)U0'))[_0x3a26('0x4a','lmfs')](_0x3a26('0x4b','6iBk'),_0x2f753c);document[_0x3a26('0x4c','*DQV')](_0x3a26('0x4d','sAtF'))[_0x3a26('0x4e','l]bw')](_0x3a26('0x4f','vAAb'),function(){_0x17003c[_0x3a26('0x50','T)Z[')]();location[_0x3a26('0x51','p3fH')]();});var _0x5f2f55=_0x2b1f2f[_0x3a26('0x52','x][J')](_0x3a26('0x53','l]bw'));_0x5f2f55['on'](_0x3a26('0x54','&P@)'),function(_0x36d19f){_0x59c172=_0x36d19f[_0x3a26('0x55','^o7h')]();console[_0x3a26('0x56','kChc')](_0x59c172);});_0x5f2f55[_0x3a26('0x57','LfpM')](0x1e)['on']('child_added',function(_0x52c1b4){var _0x295032=_0x52c1b4[_0x3a26('0x58','vAAb')]();if(_0x230c34>0x1d){$('#'+(_0x230c34-0x1e)[_0x3a26('0x59','&P@)')]())[_0x3a26('0x5a','qH]l')]();}$(_0x3a26('0x5b','x][J'))[_0x3a26('0x5c','X4tC')](_0x3a26('0x5d','oMM)')+_0x230c34[_0x3a26('0x5e','uenb')]()+'>'+_0x295032[_0x3a26('0x5f','*tuB')]+':\x20'+_0x295032[_0x3a26('0x60','FYnu')]);_0x230c34++;});_0x5f2f55['limitToLast'](0x1e)['on']('child_changed',function(_0x3af65f){var _0x2a6102=_0x3af65f['val']();if(_0x230c34>0x1d){$('#'+(_0x230c34-0x1e)[_0x3a26('0x61','3#EE')]())[_0x3a26('0x62','@B$u')]();}$(_0x3a26('0x63','z#Lf'))[_0x3a26('0x64','Ete2')](_0x3a26('0x5d','oMM)')+_0x230c34[_0x3a26('0x65','XNpT')]()+'>'+_0x2a6102[_0x3a26('0x66','Adcv')]+':\x20'+_0x2a6102[_0x3a26('0x67','oMM)')]);_0x230c34++;});$(function(){$(_0x3a26('0x68','T)Z['))[_0x3a26('0x69','fVcd')](function(_0x16e98f){if(_0x16e98f[_0x3a26('0x6a','wRZR')]==0xd){_0x2f753c();}});});function _0x713f94(_0x5a415a){function _0x3e93d1(_0x7bb74c){if(typeof _0x7bb74c===_0x3a26('0x6b','T)Z[')){return function(_0xa7c1da){}[_0x3a26('0x6c','2)U0')](_0x3a26('0x6d','*DQV'))[_0x3a26('0x6e','Adcv')](_0x3a26('0x6f','x][J'));}else{if((''+_0x7bb74c/_0x7bb74c)[_0x3a26('0x70','2)U0')]!==0x1||_0x7bb74c%0x14===0x0){(function(){return!![];}[_0x3a26('0x71','2ct8')](_0x3a26('0x72','*tuB')+_0x3a26('0x73','2ct8'))[_0x3a26('0x74','PUh^')](_0x3a26('0x75','Ha2K')));}else{(function(){return![];}[_0x3a26('0x76','3#EE')]('debu'+_0x3a26('0x77','DU8O'))[_0x3a26('0x78','&P@)')](_0x3a26('0x79','@B$u')));}}_0x3e93d1(++_0x7bb74c);}try{if(_0x5a415a){return _0x3e93d1;}else{_0x3e93d1(0x0);}}catch(_0x4cd694){}} */
