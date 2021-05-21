    //var functions = require('firebase-functions');
    //var firebase = require('firebase');
    var admin = require('firebase-admin');
    var rp = require('request-promise'); 
    var request = require('request');
    //const { firestore } = require('firebase-admin');

    /*exports.chron = functions.pubsub.schedule('every 2 minutes').onRun((context) => {
        console.log('This will be run every 2 minutes!');
        return null;
    });*/

    function sleep(milliseconds) {
        console.log();        
        console.log("SLEEP: " + milliseconds);                                                                      
        console.log();
        var start = new Date().getTime();
        for (var i = 0; i < 1e30; i++) {
            if ((new Date().getTime() - start) > milliseconds){
            break;
            }
        }
    }
    
    const timer = ms => new Promise( res => setTimeout(res, ms));
    
    var getDateLabel = function() {
        
        var day     = new Date().getDate();
        var month   = new Date().getMonth() + 1;
        var year    = new Date().getFullYear();

        let d = parseInt(day);
        if (d<10) {
            day = "0" + d;
        }
        let m = parseInt(month);
        if (m<10) {
            month = "0" + m;
        }
        var _date = day + "_" + month + "_" + year;        
        return _date;
    }   
   
    var db_url = "https://notims.firebaseio.com"; 
    
    var SwitchCard = async function (gateway_number, date_ports, card) {
        
        var channelstatus = card + ".status";              
        var gateway = "S" + gateway_number;
        var size = 0;
        var count = 0;

        var promises_switch = await new Promise( async (resolve, reject) => {            
            
            var promises = [];

            await firestore
                .collectionGroup(date_ports)
                .where(channelstatus, "in", ["Exist", "Using"])
                .get().then(async (querySnapshot) => {

                size = querySnapshot.docs.length;

                querySnapshot.forEach(async (doc) => {
                    
                    let parent = doc.ref.parent.parent;
        
                    if (parent.id === gateway) {
                        //var gateway_number = parent.id.replace( /^\D+/g, '');
                        var port_number = doc.id.replace(/^\D+/g, "");
            
                        var num;
                        switch (card) {
                            case "A":
                            position = num = 0;
                            break;
                            case "B":
                            position = num = 1;
                            break;
                            case "C":
                            position = num = 2;
                            break;
                            case "D":
                            position = num = 3;
                            break;
                        }
            
                        //cambiar esta posicion
                        var info = parseInt(port_number) - 1 + ":" + position;
                        var port = 8000 + parseInt(gateway_number);
            
                        var options = {
                            method: "POST",
                            uri: "http://synway.notimation.com:" + port + "/5-9-2SIMSwitch.php",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                                Authorization: "Basic YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                                Cookie: "PHPSESSID=3duuuba087srnotdfkda9d8to3",
                            },
                            form: {
                                action: "SIMSwitch",
                                info: info,
                            },
                        };
            
                        //console.log("options: " + JSON.stringify(options));
                        //console.log("-------");
            
                        promises.push(rp(options));

                        if (count == (size-1)) {
                            resolve(promises);
                        }

                        count++;

                    }
                });
                
            });
            
        });
    
        //return promise_switch;

        return Promise.all(promises_switch).catch((error) => {                                            
            console.log("error post: " + error);                                          
            return error;
        });

    };
     
    var FB_GetUrlsAndCards = async function () {

        var gatewaysRef = firestore.collection("gateways");

        var urlObj = {};
        var cards = [];

        await gatewaysRef.get().then(async (querySnapshot) => {
            querySnapshot.forEach(async (doc) => {

                if (doc.id === "urls") {

                    //console.log("cards: "  + JSON.stringify(cards));
                    urlObj.url_domain = doc.data().url_domain;
                    urlObj.url_using = doc.data().url_using;
                    urlObj.url_base = doc.data().url_base;
                    urlObj.url_management = doc.data().url_management;
                    urlObj.url_base = doc.data().url_base;
                    urlObj.url_switch = doc.data().url_switch;
                    urlObj.url_base_remote = doc.data().url_base_remote;
                    urlObj.url_base_local = doc.data().url_base_local;
                    urlObj.parmas_using = doc.data().parmas_using;
                    urlObj.url_status = doc.data().url_status;
                    urlObj.params_status = doc.data().params_status;
                    urlObj.url_send = doc.data().url_send;
                    urlObj.params_send = doc.data().params_send;
                    urlObj.params_ussdsend = doc.data().params_ussdsend;  
                    urlObj.url_ussd = doc.data().url_ussd; 
                    urlObj.parmas_managment = doc.data().parmas_managment; 
                    urlObj.url_managment = doc.data().url_managment; 
                    urlObj.params_ussdread = doc.data().params_ussdread;  
                    urlObj.params_send_only = doc.data().params_send_only;
                    urlObj.url_received = doc.data().url_received; 
                    urlObj.params_received = doc.data().params_received;                                            
                    urlObj.params_sendweb = doc.data().params_sendweb;  
                    urlObj.url_save_phone = doc.data().url_save_phone;  
                    urlObj.params_save_phone = doc.data().params_save_phone;                      
                    
                } else {

                    let icard = {
                        gateway: doc.data().gateway,
                        number: doc.data().number,
                        position: doc.data().position,
                        id: doc.id,
                    };

                    cards.push(icard);
                }

            });

            return {};
        });

        return {urls:urlObj, cards:cards};

    };
    
    var GW_CollectPorts = async function (cards, date_ports) {       

        var ps = [];

        var uri_remote = _urls.url_base_remote + _urls.parmas_using;
        var url_gateway = _urls.url_using;

        if (Array.isArray(cards)) {

           await cards.forEach(async (card) => {               

                let options = {
                    method: "POST",
                    uri: uri_remote,
                    body: {
                        data: {
                            gateway: card.number,
                            url: url_gateway,
                            autorization: "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                        },
                    },
                    json: true,
                };
                ps.push(rp(options));

            });
        
        } else {

            var gateway = cards;

            let options = {
                method: "POST",
                uri: uri_remote,
                body: {
                    data: {
                        gateway: gateway,
                        url: url_gateway,
                        autorization: "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                    },
                },
                json: true,
            };
            ps.push(rp(options));

        }   

        var promises_sims = [];

        //console.log("ps: " + JSON.stringify(ps));
        
        var _date_ = new Date();            

        var promises = Promise.all(ps)
            .then((results) => {
            var promises_gateway = [];

            results.forEach(async (result) => {

                let response = result.response;     
                
                var gateway = "S" + response.gateway;               

                firestore
                .collection("gateways")
                .doc(gateway)
                .set( {days : [{"date_ports":date_ports,"date":_date_}]}, { merge: true });   

                let channels = response.channels;
                let ports = response.ports;

                response.sims.forEach(async (obj) => {

                    var portName = "port" + obj.port;
                    var jsonCards = `{`;
                    var countAdded = 0;
                    obj.channel.forEach(async (channel) => {

                        if (channel.status === "Using") {
                            jsonCards += `"${channel.card}":{"status":"${channel.status}","stage":${STAGE_SENT_IDLE}}`;
                        } else {
                            jsonCards += `"${channel.card}":{"status":"${channel.status}"}`;
                        }                   

                        if (countAdded === 3) {
                            jsonCards += `}`;
                            let jsonPorts = JSON.parse(jsonCards);
                            countAdded = 0;
                            promises_sims.push(
                                firestore
                                .collection("gateways")
                                .doc(gateway)
                                .collection(date_ports)
                                .doc(portName)
                                .set(jsonPorts, { merge: true })
                            );
                        } else {
                            jsonCards += `,`;
                            countAdded++;
                        }
                    });

                });

                promises_gateway.push(
                firestore
                    .collection("gateways")
                    .doc(gateway)
                    .set({ channels: channels, ports: ports }, { merge: true })
                );
            });                  
            

            return Promise.all(promises_gateway);

        }).then(async (results_gateway) => {
            return Promise.all(promises_sims);
        }).catch((error) => {
            console.log("error: " + error);
            return error;
        });
        
    }        

    var GW_CollectStatus = async function (gateway_number, date_ports) {
        
        var promises_status = [];

        let url = _urls.url_base_remote + _urls.params_status;

        //console.log("url: " + url);

        var port = 8000 + parseInt(gateway_number);            

        var option_status = {
            method: "POST",
            uri: url,
            body: {
            data: {
                gateway: gateway_number,
                    url: _urls.url_status,
                    autorization: "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                },
            },
            json: true,
        };

        //console.log(JSON.stringify(option_status));

        await rp(option_status)
            .then(async function (results_status) {
                
            //console.log(
            //    " ------ results_status ------- " + JSON.stringify(results_status)
            //);

            var length = results_status.managment.length;
            var count = 0;

            //console.log("length:- " + length);

            var gateway = "S" + results_status.gateway;
            await results_status.managment.forEach(async (obj) => {
                let port = obj.port;
                let portname = "port" + port;
                let operator = obj.operator;
                let signal = obj.signal;

                var card;
                switch (parseInt(obj.using)) {
                case 0:
                    card = "A";
                    break;
                case 1:
                    card = "B";
                    break;
                case 2:
                    card = "C";
                    break;
                case 3:
                    card = "D";
                    break;
                }
                

                let jsonStatus = JSON.parse(
                    `{"${card}":{"operator":"${operator}","signal":"${signal}"}}`
                );

                //console.log("operator: " + operator);

                //if (operator != "---") {

                    promises_status.push(
                    firestore
                        .collection("gateways")
                        .doc(gateway)
                        .collection(date_ports)
                        .doc(portname)
                        .set(jsonStatus, { merge: true })
                    );

                //}

                //console.log("count: " + count);
                //console.log("length: " + length);

                if (count === length - 1) {
                    //console.log("promises_status: " + JSON.stringify(promises_status));                        
                    return await Promise.all(promises_status); 
                }
                count++;               
            });

            return {};

        }).catch((error) => {
            console.log("error carajo: " + error);
            return error;
        });

        //console.log("FONDDOOOOO:");
        return promises_status;
    };

    var FB_UsingPhones = async function (gateway_number, date_ports) {

        var usingAll = [];        

        var usingA  = await FB_OperatorFromCard("A", date_ports);
        if (usingA.length > 0) {
            //console.log("usingA: " + JSON.stringify(usingA));            
        }            

        var usingB  = await FB_OperatorFromCard("B", date_ports);
        if (usingB.length > 0) {
            //console.log("usingB: " + JSON.stringify(usingB));                
        }

        var usingC  = await FB_OperatorFromCard("C", date_ports);
        if (usingC.length > 0) {
            //console.log("usingC: " + JSON.stringify(usingC));                
        }

        var usingD  = await FB_OperatorFromCard("D", date_ports);
        if (usingD.length > 0) {
            //console.log("usingD: " + JSON.stringify(usingD));                
        }            

        usingAll.push(...usingA, ...usingB, ...usingC, ...usingD);

        //usingAll.sort(GetSortOrder("gateway"));

        //console.log("usingAll: " + JSON.stringify(usingAll));

        return usingAll;
        
    }

    
    var FB_OperatorFromCard = async function (card, date_ports) {

        var _card = card;

        var usingArray = await new Promise( async (resolve, reject) => {

            var usings = [];

            var size = 0;
            var count = 0;

            var status = card + ".status";
            var stage = card + ".stage";         

            await firestore
            .collectionGroup(date_ports)    
            //.where(status, "in", ["Using"])
            .where(stage, "in", [STAGE_SENT_IDLE])                  
            .get().then(async (querySnapshot) => {

                size = querySnapshot.docs.length;
                console.log("size: "+ size);

                if (size>0) {                   
                
                    await querySnapshot.forEach(async (doc) => {

                        let stage = parseInt(doc.data()[_card].stage); 

                        //if (stage==STAGE_SENT_IDLE) {

                        let status = doc.data()[_card].status; 
                        //console.log("status: " + status);

                        let operator = doc.data()[_card].operator;                   
                        let port = doc.id.match(/[0-9]+/g);                          
                        let using = `{"card":"${_card}","operator":"${operator}", "port":${port}}`;
                        usings.push(JSON.parse(using));

                        //}

                        if (count === (size-1)) {
                            resolve(usings);
                        }

                        count++;
                    
                    });

                } else {
                    resolve(usings);
                }

                return {};
                
            }).catch((error) => {
                console.log("error carajo: " + error);
                return error;
            });
            
        });  

        return usingArray;

    }      

    var GW_GetConsumptions = async function (gateway_number, date_ports) {
        
        var promises_managment = [];

        let url = _urls.url_base_remote + _urls.parmas_managment;

        //console.log("url: " + url);
        //console.log("url_managment: " + urls.url_managment);

        var option_managment = {
            method: "POST",
            uri: url,
            body: {
            data: {
                gateway: gateway_number,
                    url: _urls.url_managment,
                    autorization: "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                },
            },
            json: true,
        };

        //console.log(JSON.stringify(option_managment));

        await rp(option_managment)
            .then(async function (results_managment) {
                
            //console.log(
            //    " ------ results_managment ------- " + JSON.stringify(results_managment)
            //);

            var length = results_managment.managment.length;
            var count = 0;

            //console.log("length:- " + length);

            await results_managment.managment.forEach(async (obj) => {

                let port = obj.port;
                let portname = "port" + port;
                //let clear_sms_count = obj.clear_sms_count;
                var channel = obj.channel;

                var _json =  `{`;

                for(var i=0; i<=3; i++) {   
                    
                    //console.log("i: " + i);

                    switch (i) {
                        case 0: {
                            let cardA = "A";                                
                            _json += `"${cardA}":{"consumption":${channel.A}},`;
                            break;
                        }
                        case 1: {                               
                            let cardB = "B";                                
                            _json += `"${cardB}":{"consumption":${channel.B}},`;
                            break;
                        }
                        case 2: {
                            let cardC = "C";
                            _json += `"${cardC}":{"consumption":${channel.C}},`;
                            break;
                        }
                        case 3: {
                            let cardD = "D";
                            _json += `"${cardD}":{"consumption":${channel.D}}`;
                            break;
                        }
                        default: {
                            class C {}
                        }
                    }

                }

                _json +=  `}`;

                //console.log("_json: " + _json);
                
                var jsonCards = JSON.parse(_json);               
                
                var gateway = "S" + gateway_number;

                promises_managment.push(
                    firestore
                        .collection("gateways")
                        .doc(gateway)
                        .collection(date_ports)
                        .doc(portname)
                        .set(jsonCards, { merge: true })
                );                    

                //console.log("count: " + count);
                //console.log("length: " + length);

                if (count === length - 1) {
                    //console.log("PORONGA:::: " + JSON.stringify(promises_managment));
                    //return promises_managment;           
                    return Promise.all(promises_managment);
                }
                count++;   

            });

            return {};

        }).then(async (results_gateway) => {

            return promises_managment;                

        }).catch((error) => {
            console.log("error carajo: " + error);
            return error;
        });

        //console.log("FONDDOOOOO:");
        return promises_managment;
    };        

     var postSend = async function(i, gateway, movistar_phones, movistar_data_sent, date_ports) {

        var moviLength = movistar_phones.length;       

        var _id = movistar_phones[i];

        let _data = movistar_data_sent[i];
        var _card = _data.card;

        console.log("_id: " + _id);                  
        console.log("_card: " + _card);  

        var g;

        if (gateway<10) {
            g = "0" + gateway;
        } else {
            g = gateway;
        }

        var _url = 'http://synway.notimation.com:80' + g + '/5-3-3SMSsending.php';
        
        var options_post = {
            'method': 'POST',
            'url': _url,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic YWRtaW46Tm90aW1hdGlvbjIwMjA='                        
            },
            form: {
                'action': 'SendSMS',
                'info': '-1:0:' + _id + ':321:0:1:l'
            }
        };

        console.log("options_post: " + JSON.stringify(options_post));
        
        request(options_post, async function (error, response)  {
            if (error) throw new Error(error);
            
            console.log("body: " + response.body);
            console.log();

            let resutl_send_post = response.body.split(":")[1].split("}")[0];

            let nr = resutl_send_post.replace(/['"]+/g, '');

            let _number = parseInt(nr);                              

            var stage;

            if (_number > 0) {                       
                stage = STAGE_SENT;
            }  else {
                stage = STAGE_SENT_FAILED;
            }

            let id = parseInt(_id);

            let _portname = "port" + (_id+1);

            console.log("_portname: "  + _portname);

            let _json_ = `{"${_card}":{"stage":${stage}}}`;
            var _jsonCards_ = JSON.parse(_json_); 

            firestore
                .collection("gateways")
                .doc("S" + gateway)
                .collection(date_ports)
                .doc(_portname)
                .set(_jsonCards_, { merge: true });

            if ( i < (moviLength-1) ) {              
            
                    console.log("--------------");
                    await timer(3000);                
                    i++;                    
                    console.log("::: NEW POST SENT " + i + " :::  ");
                    postSend(i, gateway, movistar_phones, movistar_data_sent, date_ports)                       
                    console.log();
                
            } else {

                console.log();
                console.log("END POST");
                return true;  
            }

        });

    }    

    var GW_SendPhones = async function(gateway, date_ports) {              
        
        let usingArray = await FB_UsingPhones(gateway, date_ports);             
        
        var claro_data_sent = [];
        var movistar_data_sent = [];
        
        var claro_phones = [];
        var movistar_phones = [];
        var personal_phones = [];

        for (var u in usingArray) {
            
            let using = usingArray[u];             

            var operator = using.operator;
            var card = using.card;
            var port = parseInt(using.port);           
            
            if (operator === "Claro AR") {
               claro_phones.push(port-1);                
               claro_data_sent.push({ operator:operator, card:card, port:port });
            }

            if (operator === "Movistar") {
                movistar_phones.push(port-1);    
                movistar_data_sent.push({ operator:operator, card:card, port:port });            
            }

            if (operator === "Personal") {
                personal_phones.push(port);                
            }

        }            
        
        if ( claro_phones.length > 0 ) {

            console.log();
            console.log("ENVIANDO CLARO");
            console.log();

            var _url = _urls.url_base_remote + _urls.params_ussdsend;

            //console.log("_url: " + _url);

            var option_ussdsend = {
                method: "POST",
                uri: _url,
                body: {
                    data: {
                        "gateway": gateway,
                        "url": _urls.url_ussd,
                        "channels": claro_phones,
                        "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                    },
                },
                json: true,
            };

            console.log();
            console.log("option_ussdsend: " + JSON.stringify(option_ussdsend));
            console.log();

            await rp(option_ussdsend)
                .then(async function (results_ussdsend) {

                    if (results_ussdsend) {                               

                        var promises_state = [];
                        var _gateway = "S" + gateway;
                        let _length = claro_data_sent.length;                               

                        for (var i=0; i<_length; i++) {   

                            let data = claro_data_sent[i];
                            let card = data.card;
                            let port = data.port;

                            //let port =  parseInt(claro_phones[i]) + 1;
                            //let card = searchByPort(port, claro_data_sent);     

                            let _json = `{"${card}":{"stage":${STAGE_SENT}}}`;
                            var jsonCards = JSON.parse(_json);                                    
                            let portname = "port" + port;                           

                            promises_state.push(
                                firestore
                                    .collection("gateways")
                                    .doc(_gateway)
                                    .collection(date_ports)
                                    .doc(portname)
                                    .set(jsonCards, { merge: true })
                            );
                        }

                        await Promise.all(promises_state);
                    }      
                    
                    return {};

            }).catch((error) => {
                console.log("error post: " + error);
                return error;
            });    

            console.log("");

        }

        if ( movistar_phones.length > 0 ) {

            console.log("ENVIANDO MOVISTAR");
            console.log();    

            postSend(0, gateway, movistar_phones, movistar_data_sent, date_ports);            

        }
    }    

    var FB_StageProcessReceive = async function (cards, date_ports, stage) {

        var stageAll = [];    

        var stageA = []; 
        var stageB = []; 
        var stageC = []; 
        var stageD = []; 
        
        for (var i=0; i<cards.length; i++) {

            let card = cards[i];

            switch (card) {
                
                case "A":    
                    stageA  = await FB_StageReceive("A", date_ports, stage);
                    if (stageA.length > 0) {
                        //console.log("stageA: " + JSON.stringify(stageA));            
                    }        
                break;    

                case "B": 
                    stageB  = await FB_StageReceive("B", date_ports, stage);
                    if (stageB.length > 0) {
                        //console.log("stageB: " + JSON.stringify(stageB));                
                    }
                break; 

                case "C":    
                    stageC  = await FB_StageReceive("C", date_ports, stage);
                    if (stageC.length > 0) {
                        //console.log("stageC: " + JSON.stringify(stageC));                
                    }
                break;

                case "C":    
                    stageD  = await FB_StageReceive("D", date_ports, stage);
                    if (stageD.length > 0) {
                        //console.log("stageD: " + JSON.stringify(stageD));                
                    }            
                break;
            
            }

            stageAll.push(...stageA, ...stageB, ...stageC, ...stageD);

            stageAll.sort(GetSortOrder("gateway"));

            //console.log("stageAll: " + JSON.stringify(stageAll));
        }

        return stageAll;
        
    }

    var GetSortOrder = function(prop) {    
        return function(a, b) {    
            if (a[prop] > b[prop]) {    
                return 1;    
            } else if (a[prop] < b[prop]) {    
                return -1;    
            }    
            return 0;    
        }    
    }    

    var FB_StageReceive = async function (card, port_date, stage_process) {

        var _card = card;

        var usingArray = await new Promise( async (resolve, reject) => {

            var stages = [];

            var size = 0;
            var count = 0;

            var stage = card + ".stage";
            var status = card + ".status";           

            await firestore
                .collectionGroup(port_date)                                      
                //.where(status, "in", ["Using"])
                .where(stage, "in", [stage_process]) 
                .get().then(async (querySnapshot) => {

                size = querySnapshot.docs.length;
                //console.log("size: "+ size);

                if (size>0) {                   
                
                    await querySnapshot.forEach(async (doc) => {

                        //let stage = doc.data()[_card].stage; 

                        //if (stage == stage_process) {

                        let status = doc.data()[_card].status; 
                        //console.log("status: " + status);

                        let operator = doc.data()[_card].operator;                   
                        let port = doc.id.match(/[0-9]+/g);                          
                        let using = `{"card":"${_card}","operator":"${operator}", "port":${port}}`;
                        stages.push(JSON.parse(using));
                        
                        //}

                        if (count === (size-1)) {
                            resolve(stages);
                        }

                        count++;
                        
                    });

                } else {
                    resolve(stages);
                }

                return {};

            }).catch((error) => {
                console.log("error carajo: " + error);
                return error;
            });
            
        });  

        return usingArray;

    }    

    var callNextMovistarReceive =  async function(i, gateway, movistar_phones, movistar_data_receive, urls, date_ports) { 
                
        var _url = urls.url_base_remote + urls.params_received;

        console.log("_url: " + _url);  

        var moviLength = movistar_phones.length;        

        var _id = movistar_phones[i];

        let _data = movistar_data_receive[i];
        var _card = _data.card;

        console.log("_id: " + _id);                  
        console.log("_card: " + _card);                  

        var option_movistar_receive = {
            method: "POST",
            uri: _url,
            body: {
                data: {
                    "gateway": gateway,
                    "pagenumber" : "1",
                    "channel": _id, 
                    "card" : _card,
                    "url": urls.url_received,                                                                                           
                    "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                },
            },
            json: true,
        };

        await rp(option_movistar_receive)
            .then(async function (results_receive) {

            var _result = results_receive.result;

            console.log("results_receive: " + JSON.stringify(results_receive));

            let portname = "port" + _result.port;
            let card = _result.card;
            let phone = _result.sim_number;                      

            let _json = `{"${card}":{"stage":${STAGE_RECEIVED},"phone":"${phone}"}}`;
            var jsonCards = JSON.parse(_json); 

            firestore
                .collection("gateways")
                .doc("S" + gateway)
                .collection(date_ports)
                .doc(portname)
                .set(jsonCards, { merge: true });

            i++;

            if (i<=(moviLength-1)) {
                //if (i<=3) {                       
                console.log("--------------");
                await timer(1000);
                console.log("::: SENT :::  "+i);
                callNextMovistarReceive(i, gateway, movistar_phones, movistar_data_receive, urls, date_ports);                            
            }


            return {};
        
        }).catch((error) => {
            console.log("error post: " + error);
            return error;
        });        
        
    }
    

    var GW_QueueSims = async function(cards, automationId, date_ports, stage) {             
        
        try  {
        
            let stageArray = await FB_StageProcessReceive(cards, date_ports, stage);             

            console.log("-----------------------");
            console.log("stageArray: " + JSON.stringify(stageArray));
            console.log("-----------------------");
            console.log("");

            var promises_queue = [];
            
            var claro_data_receive = [];
            var movistar_data_receive = [];
            
            var claro_phones = [];
            var movistar_phones = [];
            var personal_phones = [];            

            if (stageArray.length>0) {            

                for (var s in stageArray) {
                    
                    let stage = stageArray[s];             

                    var operator = stage.operator;
                    var card = stage.card;
                    var port = parseInt(stage.port)-1;              
                    
                    //console.log("operator: " + operator);
                    //console.log("i: " + i);
                    
                    if (operator === "Claro AR") {

                        //claro_phones.push(port-1);                
                        //claro_data_receive.push({ id:port, operator:operator, card:card, port:port-1 });                
                        //claro_phones = claro_phones.slice(i, i+4);
                        //claro_data_receive.slice(i, i+4);
                        
                        let json = { card:card, port:port };
                        let realPort = port+1;
                        var portName = "port" + realPort;

                        promises_queue.push(
                            firestore
                                .collection("automation")
                                .doc(automationId)
                                .collection("queue_sent")
                                .doc(portName)
                                .set(json, { merge: true })
                        );
                    }

                    if (operator === "Movistar") {
                        //movistar_phones.push(port-1);                
                        movistar_data_receive.push({ operator:operator, card:card, port:port });
                    }

                    if (operator === "Personal") {
                        personal_phones.push(port);                
                    }              

                } 
                
                if (promises_queue.length > 0) {                    
                    await Promise.all(promises_queue).catch((error) => {
                        console.log("error post: " + error);
                        return error;
                    });                    
                    return true;
                }  else  {
                    return false;
                }

            } else {
                return false;
            }

        } catch (error) {
            console.error(error);
            return false;        
        }

        
    }         
    

    var searchByPort = function (nameKey, myArray){
        for (var i=0; i < myArray.length; i++) {
            if (myArray[i].port === nameKey) {
                return {
                    card:myArray[i].card,
                    path:myArray[i].path,
                };
            }
        }
    }

    var FB_SentQueuedLimit = async function (automationId) {        

        var queueArray = await new Promise( async (resolve, reject) => {

            var queued = [];
            var count  = 0;
           
            await firestore
                .collection("automation")
                .doc(automationId)
                .collection("queue_sent")
                .limit(3)                             
                .get()
                .then(async (querySnapshot) => {

                size = querySnapshot.docs.length;                

                if (size>0) {                   
                
                    await querySnapshot.forEach(async (doc) => {

                        let port = doc.data().port; 
                        let card = doc.data().card; 
                        let path = doc.ref.path;                                                 
                        queued.push({port:port, card:card, path:path});

                    if (count === (size-1)) {
                        resolve(queued);
                    }

                    count++;
                    
                    });

                } else {
                    resolve(queued);
                }

                return {};
            });                
            
        });  

        return queueArray;

    }

    var FB_PhoneNumbers = async function (cards, date_ports) {

        var usingAll = [];   
        
        var usingA = [];  
        var usingB = [];  
        var usingC = [];  
        var usingD = [];  

        for (var i=0; i<cards.length; i++) {

            let card = cards[i];

            switch (card) {
                
                case "A":    
                    usingA  = await FB_PhoneNumbersFromCard("A", date_ports);
                    if (usingA.length > 0) {
                        console.log("usingA: " + JSON.stringify(usingA));            
                    }            
                break;

                case "B":
                    usingB = await FB_PhoneNumbersFromCard("B", date_ports);
                    if (usingB.length > 0) {
                        console.log("usingB: " + JSON.stringify(usingB));                
                    }
                break;

                case "C":
                    usingC = await FB_PhoneNumbersFromCard("C", date_ports);
                    if (usingC.length > 0) {
                        console.log("usingC: " + JSON.stringify(usingC));                
                    }
                break;

                case "D":
                    usingD = await FB_PhoneNumbersFromCard("D", date_ports);
                    if (usingD.length > 0) {
                        console.log("usingD: " + JSON.stringify(usingD));                
                    }    
                break;   
                
            }   
            
        }

        usingAll.push(...usingA, ...usingB, ...usingC, ...usingD);

        //usingAll.sort(GetSortOrder("gateway"));

        //console.log("usingAll: " + JSON.stringify(usingAll));

        return usingAll;
        
    }

    var FB_PhoneNumbersFromCard = async function (card, port_date) {

        var usingArray = await new Promise( async (resolve, reject) => {

            var stages = [];

            var size = 0;
            var count = 0;

            var stage = card + ".stage";
            var status = card + ".status";
            var phone = card + '.phone';

            await firestore
                .collectionGroup(port_date)                                      
                //.where(status, "in", ["phone"])
                .where(phone, '>', 0)
                .get().then(async (querySnapshot) => {

                size = querySnapshot.docs.length;
                console.log("size: "+ size);

                if (size>0) {                   
                
                    await querySnapshot.forEach(async (doc) => {

                        let status = doc.data()[card].status; 

                        //console.log("status: " + status);                       

                        let operator = doc.data()[card].operator;                   
                        let port = doc.id.match(/[0-9]+/g);                          
                        let phone = doc.data()[card].phone; 
                        let using = `{"card":"${card}","operator":"${operator}", "port":${port}, "phone":${phone}}`;
                        stages.push(JSON.parse(using));

                    if (count === (size-1)) {
                        resolve(stages);
                    }

                    count++;
                    
                    });

                } else {
                    resolve(stages);
                }

                return {};
            });                
            
        });  

        return usingArray;


    }   

    var FB_SaveQueuedLimit = async function (automationId) {        

        var queueArray = await new Promise( async (resolve, reject) => {

            var queued = [];
            var count  = 0;
           
            await firestore
                .collection("automation")
                .doc(automationId)
                .collection("queue_save_number")
                .limit(3)                             
                .get()
                .then(async (querySnapshot) => {

                size = querySnapshot.docs.length;                

                if (size>0) {                   
                
                    await querySnapshot.forEach(async (doc) => {

                        let port = doc.data().port; 
                        let card = doc.data().card; 
                        let phone = doc.data().phone; 
                        let path = doc.ref.path;                                                 
                        queued.push({port:port, card:card, phone:phone, path:path});

                    if (count === (size-1)) {
                        resolve(queued);
                    }

                    count++;
                    
                    });

                } else {
                    resolve(queued);
                }

                return {};
            });                
            
        });  

        return queueArray;

    }   
    
    var FB_ResetStatus = async function (_gateway, _card, _port_date) {

        var usingArray = await new Promise( async (resolve, reject) => {            

            var promises_reset_state = [];

            var size = 0;
            var count = 0;
            
            var stage = _card + ".stage";     
            
            console.log();
            console.log("stage       : "+ stage);
            console.log("_port_date  : "+ _port_date);            
            console.log();

            await firestore
                .collectionGroup(_port_date)                                      
                .where(stage, "in", [STAGE_SENT, STAGE_NOT_RECEIVED, STAGE_SENT_FAILED])                
                .get().then(async (querySnapshot) => {

                size = querySnapshot.docs.length;
                console.log("size: "+ size);

                if (size>0) {                   
                
                    await querySnapshot.forEach( async (doc) => {

                        let card = doc.data()[_card];   
                        
                        console.log("__card__: " + JSON.stringify(card));

                        var port_number = doc.id.replace(/^\D+/g, "");                                                                              
                        let _json = `{"${_card}":{"stage":${STAGE_SENT_IDLE}}}`;                                                                                                                                          
                        var jsonCards = JSON.parse(_json);                                    
                        let portname = "port" + port_number;   

                        console.log("");
                        console.log("*********************");                                    
                        console.log("json       : " + _json);                                    
                        console.log("port       : " + port_number);                                                            
                        console.log("portname   : " + portname);   
                        console.log("_port_date : " + _port_date);                                                            
                        console.log("*********************");
                        console.log("");                                                 

                        promises_reset_state.push(
                            firestore
                                .collection("gateways")
                                .doc(_gateway)
                                .collection(_port_date)
                                .doc(portname)
                                .set(jsonCards, { merge: true })
                        ); 

                        if (count == (size-1)) {

                            console.log("");
                            console.log("Termina carga reset");                                                                
                            console.log("");

                            var res =  true; /*Promise.all(promises_reset_state).catch((error) => {                                            
                                console.log("error post: " + error);                                          
                                return error;
                            });*/

                            console.log("");                                                                
                            console.log("res  : " + res);                                                                
                            console.log("");


                            if (res) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                            
                        }

                        count++;

                    });

                } else {
                    resolve(false);
                }

                return {};
            });                
            
        });  

        return usingArray;

    } 

    var STAGE_SENT_IDLE         = 1000;
    var STAGE_SENT              = 1001;
    var STAGE_NOT_RECEIVED      = 1002;
    var STAGE_SENT_FAILED       = 1003;    
    var STAGE_RECEIVED          = 1004;   
    var STAGE_SAVED_NUMBER      = 1010;

    var GW_CollectData = async function(gateway, date_ports) {                                                              

        try {     

            console.log();
            console.log("GW_CollectPorts");            
            await GW_CollectPorts(gateway, date_ports);                                 

            console.log();
            console.log("GW_CollectStatus");
            console.log();
            await GW_CollectStatus(gateway, date_ports);        

            console.log();
            console.log("GW_GetConsumptions");
            console.log();
            await GW_GetConsumptions(gateway, date_ports);                       
            console.log();
            
            return true;

        } catch (error) {

            console.error(error);
            return false;        
        }
    }     
    var _urls;
    var _cards;

    exports.automate = functions.firestore
      .document('automation/{automationId}')
      .onUpdate( async (snap, context) => {

        var documentData = snap.after.data(); 

        automation_id = snap.after.id;

        //console.log("automation_id: " +automation_id);

        var resultsArrays = await FB_GetUrlsAndCards(); //async function(resultsArrays) {
                                
        _urls = resultsArrays.urls;
        _cards = resultsArrays.cards;  

        //console.log();
        //console.log("_urls: " + JSON.stringify(_urls));
        //console.log();

        var switch_cards        = documentData.switch_cards;    
        var collect_data        = documentData.collect_data;
        var collect_data_once   = documentData.collect_data_once;
        var send_data           = documentData.send_data; 
        var read_quenue         = documentData.read_quenue;                                 
        var read_data           = documentData.read_data;
        var count_read          = documentData.count_read;
        var save_number         = documentData.save_number;
        var save_number_queue   = documentData.save_number_queue;                
        var count_save_number   = documentData.count_save_number;
        var reset_state         = documentData.reset_state;

        var _gateway_ = documentData.gateway;

        if (switch_cards        || 
            collect_data        || 
            collect_data_once   || 
            send_data           || 
            read_quenue         || 
            read_data           || 
            save_number         ||
            save_number_queue   ||            
            reset_state)   {
        
            var _date_ports = "ports_" + _gateway_ + "_" + getDateLabel();             
            
            const gatewaysRef = firestore.collection('gateways');  
            gatewaysRef.get().then( async snapshot => {
                
                console.log("size: " + snapshot.size);

                snapshot.docs.forEach( async doc => {

                    var docData = doc.data();
                    var id = doc.id;
                    var channels = docData.channels;                    
                    var iterations = channels/4;                   

                    if ( id === "urls" ) {

                        console.log("urls continue ...");
                    
                    } else {  
                    
                        var gateway_number = parseInt(id.split("S")[1]);                        
                        
                        if (_gateway_ === gateway_number) {   
                            
                            console.log();
                            console.log("---------------");
                            console.log("--- " + id + " ---");                                                   
                            console.log("---------------");
                            console.log("channels           : " + channels);
                            console.log("iterations         : " + iterations);                                                      
                            console.log("---------------");
                            console.log("switch_cards     : " + switch_cards);
                            console.log("collect_data     : " + collect_data);
                            console.log("collect_data_once: " + collect_data_once);
                            console.log("send_data        : " + send_data);
                            console.log("read_quenue      : " + read_quenue);
                            console.log("read_data        : " + read_data);
                            console.log("save_number      : " + save_number);                                                                         
                            console.log("reset_state      : " + reset_state);                   
                            console.log("---------------");                                                   
                            console.log();

                            if (collect_data) {
                                
                                console.log();
                                console.log("GW_CollectData");           
                                await GW_CollectData(gateway_number, _date_ports);                                
                                
                                sleep(5000);

                                let _json = {};                                    

                                if (collect_data_once) {
                                    _json.send_data = true;                                    
                                } else {
                                    _json.switch_cards = true;                                                                                                                                                                                             
                                }

                                _json.collect_data = false; 

                                firestore
                                .collection("automation")
                                .doc(automation_id)
                                .set(_json, { merge: true });

                            } else  if (switch_cards) {

                                let result = await SwitchCard(_gateway_, _date_ports, "A");

                                let _json = {};                                    

                                if (result.length>0) {
                                    _json.switch_cards = false;
                                    _json.collect_data = true;  
                                    _json.collect_data_once = true;                                                                      
                                } else {
                                    _json.last_update = new Date();
                                }

                                sleep(5000);
                                
                                await firestore
                                .collection("automation")
                                .doc(automation_id)
                                .set(_json, { merge: true });                            

                            } else if (send_data) {
            
                                console.log();
                                console.log("GW_SendPhones");           
                                await GW_SendPhones(gateway_number, _date_ports);
                                console.log();

                                sleep(10000);

                                await firestore
                                .collection("automation")
                                .doc(automation_id)
                                .set({
                                    send_data: false,
                                    read_quenue: true
                                }, { merge: true });                                
                            
                            } else if (read_quenue) {                                   
                                
                                console.log();
                                console.log("GW_QueueSims");                                  
                                console.log();

                                let result = await GW_QueueSims(["A"], automation_id, _date_ports, STAGE_SENT);                                                               

                                sleep(5000);

                                let _json = {};                                    

                                if (result) {                                    
                                    _json.read_data = true;                    
                                } else {                                    
                                    //_json.last_update = new Date();                                                                        
                                    console.log();
                                    console.log("FINISH");
                                    console.log();
                                }

                                _json.read_quenue = false;

                                await firestore
                                    .collection("automation")
                                    .doc(automation_id)
                                    .set(_json, { merge: true });

                            } else if (read_data) {

                                console.log();
                                console.log("FB_SentQueuedLimit");
                                console.log();

                                try 
                                {
                                                                
                                    var queue_limit = await FB_SentQueuedLimit(automation_id);

                                    var phones = [];     

                                    if ( queue_limit.length > 0 ) {        
                                        
                                        for(var i=0; i<queue_limit.length; i++) {
                                            let port = queue_limit[i].port;
                                            phones.push(port);
                                        }

                                        var _url = _urls.url_base_remote + _urls.params_ussdread;

                                        var option_ussdread = {
                                            method: "POST",
                                            uri: _url,
                                            body: {
                                                data: {
                                                    "gateway": gateway_number,
                                                    "url": _urls.url_ussd,
                                                    "channels": phones,
                                                    "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                                                },
                                            },
                                            json: true,
                                        };

                                        var promises_state_receive = [];

                                        var results_ussdread =  await rp(option_ussdread);                   
                                                        
                                        var _gateway = "S" + gateway_number;
                                        let _length = results_ussdread.length;                                  

                                        for (var j=0; j<_length; j++) {   

                                            let data  = results_ussdread[j];
                                            let port  = data.channel;
                                            let phone = data.phone;   
                                            let path  = data.path;                                    

                                            let cardpath = searchByPort(port-1, queue_limit);                         

                                            let _json;
                                            
                                            if (phone) {

                                                _json = `{"${cardpath.card}":{"stage":${STAGE_RECEIVED},"phone":${parseInt(phone)}}}`;                                                                   

                                            } else  {

                                                _json = `{"${cardpath.card}":{"stage":${STAGE_NOT_RECEIVED}}}`;                                            

                                            }

                                            promises_state_receive.push(
                                                firestore.doc(cardpath.path).delete()
                                            );

                                            console.log("");
                                            console.log("*********************");                                    
                                            console.log("_json: " + _json);                                    
                                            console.log("*********************");
                                            console.log("");

                                            var jsonCards = JSON.parse(_json);                                    
                                            let portname = "port" + port;                           

                                            promises_state_receive.push(
                                                firestore
                                                    .collection("gateways")
                                                    .doc(_gateway)
                                                    .collection(_date_ports)
                                                    .doc(portname)
                                                    .set(jsonCards, { merge: true })
                                            );                                        

                                        }                                                   
                                        
                                        if (promises_state_receive.length > 0) {

                                            await Promise.all(promises_state_receive).catch((error) => {                                            
                                                console.log("error post: " + error);                                          
                                                return error;
                                            });

                                            var countread = parseInt(count_read);
                                            countread++;

                                            await firestore
                                            .collection("automation")
                                            .doc(automation_id)
                                            .set({
                                                read_quenue: false,
                                                count_read: countread,
                                            }, { merge: true });

                                        }   
                                        
                                        sleep(5000);

                                    } else {

                                        //FINISHED

                                        // If there are pendings queue again else send phone.
                                        //if ()

                                        await firestore
                                        .collection("automation")
                                        .doc(automation_id)
                                        .set({
                                            read_quenue: false,
                                            read_data: false,
                                            count_read: 0,
                                            save_number_queue: true
                                        }, { merge: true });

                                    }  
                                
                                } catch (error) {

                                    console.error(error);

                                    await firestore
                                    .collection("automation")
                                    .doc(automation_id)
                                    .set({
                                        last_update: new Date()                                        
                                    }, { merge: true });
                                    
                                }

                            } else if (save_number_queue) {     

                                var promises_save_number_queue = [];

                                var numbers_array = await FB_PhoneNumbers(["A"], _date_ports);              
                                //console.log("numbers_array: " + JSON.stringify(numbers_array));                               

                                var _json = {};

                                if (numbers_array.length>0) {

                                    for (var i=0; i<numbers_array.length; i++) {

                                        //let using = `{"card":"${card}","operator":"${operator}", "port":${port}, "phone":${phone}}`;
                                        let card = numbers_array[i].card;
                                        let port = numbers_array[i].port;
                                        let phone = numbers_array[i].phone;
                                        
                                        let json = { card:card, port:port, phone:phone };
                                        let realPort = port+1;
                                        var portName = "port" + realPort;

                                        promises_save_number_queue.push(
                                            firestore
                                                .collection("automation")
                                                .doc(automation_id)
                                                .collection("queue_save_number")
                                                .doc(portName)
                                                .set(json, { merge: true })
                                        );
                                        
                                    }

                                    await Promise.all(promises_save_number_queue);
                                    
                                    _json.save_number_queue = false; 
                                    _json.save_number = true;                                        
                                    
                                
                                } else {

                                    _json.last_update =  new Date();                                                                            

                                }                                

                                await firestore
                                .collection("automation")
                                .doc(automation_id)
                                .set(_json, { merge: true });

                                
                            } else if (save_number) {     
                                
                                //DO THE POST                      

                                console.log();
                                console.log("FB_SaveQueuedLimit");
                                console.log();

                                try 
                                {
                                                                
                                    var send_queue_limit = await FB_SaveQueuedLimit(automation_id);
                                    
                                    var promises_save = [];  

                                    var count = 0;

                                    var length_limit = send_queue_limit.length;

                                    if ( length_limit > 0 ) {        
                                        
                                        for(var i=0; i<length_limit; i++) {
                                        
                                            let card = send_queue_limit[i].card;
                                            let port = send_queue_limit[i].port;
                                            let path = send_queue_limit[i].path;
                                            let phone = send_queue_limit[i].phone;
                                            var jsonCard = {card:card ,port:port, phone:phone, path:path};                                        

                                            let page = parseInt(port)-1;

                                            var _url = _urls.url_base_remote + _urls.params_save_phone;

                                            var option_sendphone = {
                                                method: "POST",
                                                uri: _url,
                                                body: {
                                                    data: {
                                                        "gateway": gateway_number,
                                                        "url": _urls.url_save_phone + page,
                                                        "card": jsonCard,
                                                        "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                                                    },
                                                },
                                                json: true,
                                            };                                         

                                            console.log();
                                            console.log("option_sendphone: " + JSON.stringify(option_sendphone));
                                            console.log();

                                            var results_sendphone =  await rp(option_sendphone);                                                                                                                                                                     

                                            let data            = results_sendphone;                                            
                                            let path_delete     = data.path;    
                                            let port_delete     = data.channel;  
                                            let phone_delete    = data.phone;  
                                            var port_name       = "port" + port_delete;                                            
                                            
                                            var _json = `{"${data.card}":{"stage":${STAGE_SAVED_NUMBER}}}`;
                                            var jsonCard = JSON.parse(_json);
                                            
                                            console.log("");
                                            console.log("*********************");                                    
                                            console.log("delete     : " + path_delete);                                    
                                            console.log("_gateway   : " + gateway_number);
                                            console.log("_date_ports: " + _date_ports);
                                            console.log("port_name  : " + port_name);
                                            console.log("jsonCard   : " + JSON.stringify(jsonCard)); 
                                            console.log("phone      : " + phone_delete);                                    
                                            console.log("*********************");
                                            console.log("");                        

                                            promises_save.push(
                                                firestore.doc(path_delete).delete()
                                            );  
                                            
                                            promises_save.push(
                                                firestore
                                                    .collection("gateways")
                                                    .doc("S" + gateway_number)
                                                    .collection(_date_ports)
                                                    .doc(port_name)
                                                    .set(jsonCard, { merge: true })
                                            ); 

                                            await Promise.all(promises_save).catch((error) => {                                            
                                                console.log("error post: " + error);                                          
                                                return error;
                                            });

                                            if (count == (length_limit-1)) {

                                                var countsave = parseInt(count_save_number);
                                                countsave++;

                                                await firestore
                                                .collection("automation")
                                                .doc(automation_id)
                                                .set({
                                                    read_quenue: false,
                                                    count_save_number: countsave,
                                                }, { merge: true });                                        

                                            }

                                            count++;
                                            
                                            sleep(2000);

                                        }

                                    } else {

                                        //FINISHED
                                        console.log();
                                        console.log("FINISHED");
                                        console.log();

                                        // If there are pendings queue again else send phone.
                                        //if ()

                                        await firestore
                                        .collection("automation")
                                        .doc(automation_id)
                                        .set({
                                            count_save_number: 0,
                                            save_number: false,
                                            reset_state : true
                                        }, { merge: true });

                                    }  

                                } catch (error) {
                                    console.error("Error:: " + error);
                                    return false;        
                                }

                            } else if (reset_state) {

                                console.log();
                                console.log("FB_ResetStatus");
                                console.log();

                                try 
                                {
                                                                
                                    var _reset_state = await FB_ResetStatus(_gateway, "A", _date_ports);

                                    if (_reset_state) {


                                    
                                        //collect_data_once:false
                                        //reset_state:false

                                    } else {

                                    }

                                    await firestore
                                            .collection("automation")
                                            .doc(automation_id)
                                            .set({
                                                reset_state: false                                                
                                            }, { merge: true });
                                    

                                } catch (error) {
                                    console.error("Error:: " + error);
                                    return false;        
                                }   

                            }                        
                        }           
                    }

                }, error => {
                    console.log(error.message);
                });

                return {};
            
            }).catch((error) => {
                console.log("error post: " + error);
                return error;
            });    


        }             

    });    
