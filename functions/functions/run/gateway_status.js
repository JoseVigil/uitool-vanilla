    var functions = require('firebase-functions');
    var firebase = require('firebase');
    var admin = require('firebase-admin');
    var rp = require('request-promise'); 

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
    
    var args = process.argv.slice(2);
    
    if (args[0].includes('emulate')) {

        process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'; 

        var db_url = "https://notims.firebaseio.com";

        const serviceAccount = require('../key/notims-firebase-adminsdk-rwhzg-c634d4946a.json');
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: db_url,        
        }); 
        
        firestore = admin.firestore();    
        //const storage = admin.storage();

        const firebaseConfig = {
            apiKey: "AIzaSyAM4WQDHpHh1oRT_v-6ikquE4V809hA3kY",
            authDomain: "notims.firebaseapp.com",
            databaseURL: db_url,
            projectId: "notims",
            storageBucket: "notims.appspot.com",
            messagingSenderId: "79471870593",
            appId: "1:79471870593:web:ef29a72e1b1866b2bb4380",
            measurementId: "G-8T5N81L78J"
        };
        
        firebase.initializeApp(firebaseConfig);
        firebase.functions().useFunctionsEmulator('http://localhost:5000');    

        var gateway_number = args[1];    
        var card = args[2];
        

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

        var GW_CollectPorts = async function (urlObj, cards) {

            var ps = [];

            await cards.forEach(async (card) => {
                
                var uri_remote = urlObj.url_base_remote + urlObj.parmas_using;
                var url_gateway = urlObj.url_using; //urlObj.url_domain + urlObj.url_using;

                //console.log("uri_remote: " + uri_remote);
                //console.log("url_gateway: " + url_gateway);

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

            var promises_sims = [];

            //console.log("ps: " + JSON.stringify(ps));

            var _date = getDateLabel();
            var date = new Date();            

            var promises = Promise.all(ps)
                .then((results) => {
                var promises_gateway = [];

                results.forEach(async (result) => {

                    let response = result.response;     
                    
                    var gateway = "S" + response.gateway;
                    var coll_name = "ports_" + _date;                    

                    firestore
                    .collection("gateways")
                    .doc(gateway)
                    .set( {days : [{coll_name,date}]}, { merge: true });   

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
                                    .collection(coll_name)
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

        var GW_CollectStatus = async function (gateway_number, urls, date) {
            
            var promises_status = [];

            let url = urls.url_base_remote + urls.params_status;

            //console.log("url: " + url);

            var port = 8000 + parseInt(gateway_number);            

            var option_status = {
                method: "POST",
                uri: url,
                body: {
                data: {
                    gateway: gateway_number,
                        url: urls.url_status,
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
                            .collection("ports_" + date)
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

        var FB_UsingPhones = async function (gateway_number, urls, date) {

            var usingAll = [];

            var port_date = "ports_" + date;           

            var usingA  = await FB_OperatorFromCard("A", port_date);
            if (usingA.length > 0) {
                //console.log("usingA: " + JSON.stringify(usingA));            
            }            

            var usingB  = await FB_OperatorFromCard("B", port_date);
            if (usingB.length > 0) {
                //console.log("usingB: " + JSON.stringify(usingB));                
            }

            var usingC  = await FB_OperatorFromCard("C", port_date);
            if (usingC.length > 0) {
                //console.log("usingC: " + JSON.stringify(usingC));                
            }

            var usingD  = await FB_OperatorFromCard("D", port_date);
            if (usingD.length > 0) {
                //console.log("usingD: " + JSON.stringify(usingD));                
            }            

            usingAll.push(...usingA, ...usingB, ...usingC, ...usingD);

            usingAll.sort(GetSortOrder("gateway"));

            //console.log("usingAll: " + JSON.stringify(usingAll));

            return usingAll;
            
        }

        
        var FB_OperatorFromCard = async function (card, port_date) {

            var _card = card;

            var usingArray = await new Promise( async (resolve, reject) => {

                var usings = [];

                var size = 0;
                var count = 0;

                var status = card + ".status";
                var stage = card + ".stage";

                console.log("status: " + status);
                console.log("stage: " + stage);

                //let stage_idle      = `"${STAGE_SENT_IDLE}"`;
                //let stage_failed    = `"${STAGE_SENT_FAILED}"`;

                await firestore
                    .collectionGroup(port_date)                
                    .where(status, "in", ["Using"])
                    .where(stage, "in", [STAGE_SENT_IDLE])     
                    .get()
                    .then(async (querySnapshot) => {

                    size = querySnapshot.size;
                    console.log("size: "+ size);

                    if (size>0) {                   
                    
                        await querySnapshot.forEach(async (doc) => {

                            let status = doc.data()[_card].status; 

                            //console.log("status: " + status);

                            let operator = doc.data()[_card].operator;                   
                            let port = doc.id.match(/[0-9]+/g);                          
                            let using = `{"card":"${_card}","operator":"${operator}", "port":${port}}`;
                            usings.push(JSON.parse(using));

                        if (count === (size-1)) {
                            resolve(usings);
                        }

                        count++;
                        
                        });

                    } else {
                        resolve(usings);
                    }

                    return {};
                });                
                
            });  

            return usingArray;

        }      

        var GW_GetConsumptions = async function (gateway_number, urls) {
            
            var promises_managment = [];

            let url = urls.url_base_remote + urls.parmas_managment;

            //console.log("url: " + url);
            //console.log("url_managment: " + urls.url_managment);

            var option_managment = {
                method: "POST",
                uri: url,
                body: {
                data: {
                    gateway: gateway_number,
                        url: urls.url_managment,
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

                    var _date = getDateLabel();
                    
                    var gateway = "S" + gateway_number;

                    promises_managment.push(
                        firestore
                            .collection("gateways")
                            .doc(gateway)
                            .collection("ports_" + _date)
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


        var callNextMovistarSend = async function(movistar_phones, movistar_data_sent) { 
                    
            let _id = movistar_phones[i];

            let _data = movistar_data_sent[i];
            var _card = _data.card;

            console.log("_id: " + _id);                  
            console.log("_card: " + _card);                  

            var option_movistar_send = {
                method: "POST",
                uri: _urlm,
                body: {
                    data: {
                        "gateway": gateway,
                        "recipient": "321",
                        "url": urls.url_send,
                        "channel": _id,                                
                        "message":"linea",                                
                        "card" : _card,
                        "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                    },
                },
                json: true,
            };

            await rp(option_movistar_send)
                .then(async function (results_send) {

                var _result = results_send.result;

                console.log("results_send: " + JSON.stringify(results_send));

                let portname = "port" + _result.port;
                let card = _result.card;
                let status = _result.status;

                var stage;

                if (status === "Success") {
                    stage = STAGE_SENT;
                } else if (status === "Failed") {
                    stage = STAGE_SENT_FAILED;
                } else if (status === "Sending") {
                    stage = STAGE_SENT_SENDING;
                } else if (status === "Timeout") {
                    stage = STAGE_SENT_TIMEOUT;
                }

                let _json = `{"${card}":{"stage":${stage}}}`;
                var jsonCards = JSON.parse(_json); 

                firestore
                    .collection("gateways")
                    .doc("S" + gateway)
                    .collection("ports_" + date)
                    .doc(portname)
                    .set(jsonCards, { merge: true });

                i++;

                if (i<=(moviLength-1)) {
                    //if (i<=3) {                       
                    console.log("--------------");
                    await timer(1000);
                    console.log("::: SENT :::  "+i);

                    callNextMovistarSend(movistar_phones, movistar_data_sent);                            
                }

                return {};
            
            }).catch((error) => {
                console.log("error post: " + error);
                return error;
            });        
            
        }
        

        var GW_SendPhones = async function(gateway, urls, date) {              
            
            let usingArray = await FB_UsingPhones(gateway, urls, date);             
            
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
              
              
              //if (operator === "Claro AR") {
              //   claro_phones.push(port-1);                
              //   claro_data_sent.push({ operator:operator, card:card, port:port });
              //}

              if (operator === "Movistar") {
                 movistar_phones.push(port-1);    
                 movistar_data_sent.push({ operator:operator, card:card, port:port });            
              }

              if (operator === "Personal") {
                personal_phones.push(port);                
              }

            }            
            
            if ( claro_phones.length > 0 ) {

                var _url = urls.url_base_remote + urls.params_ussdsend;

                //console.log("_url: " + _url);

                var option_ussdsend = {
                    method: "POST",
                    uri: _url,
                    body: {
                        data: {
                            "gateway": gateway,
                            "url": urls.url_ussd,
                            "channels": claro_phones,
                            "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                        },
                    },
                    json: true,
                };

                console.log("option_ussdsend: " + JSON.stringify(option_ussdsend));

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
                                        .collection("ports_" + date)
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

            }

            if ( movistar_phones.length > 0 ) {

                console.log();
                console.log("movistar_phones: " + JSON.stringify(movistar_phones));

                var _urlm = urls.url_base_remote + urls.params_send;

                console.log("_urlm: " + _urlm);

                var moviLength = movistar_phones.length;             

                var i=0;                
                
                callNextMovistarSend(movistar_phones, movistar_data_sent);
            }
        }

        

        var FB_StageProcessReceive = async function (gateway_number, urls, date) {

            var stageAll = [];

            var port_date = "ports_" + date;           

            var stageA  = await FB_StageReceive("A", port_date);
            if (stageA.length > 0) {
                //console.log("stageA: " + JSON.stringify(stageA));            
            }            

            var stageB  = await FB_StageReceive("B", port_date);
            if (stageB.length > 0) {
                //console.log("stageB: " + JSON.stringify(stageB));                
            }

            var stageC  = await FB_StageReceive("C", port_date);
            if (stageC.length > 0) {
                //console.log("stageC: " + JSON.stringify(stageC));                
            }

            var stageD  = await FB_StageReceive("D", port_date);
            if (stageD.length > 0) {
                //console.log("stageD: " + JSON.stringify(stageD));                
            }            

            stageAll.push(...stageA, ...stageB, ...stageC, ...stageD);

            stageAll.sort(GetSortOrder("gateway"));

            //console.log("stageAll: " + JSON.stringify(stageAll));

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

        var FB_StageReceive = async function (card, port_date) {

            var _card = card;

            var usingArray = await new Promise( async (resolve, reject) => {

                var stages = [];

                var size = 0;
                var count = 0;

                var stage = card + ".stage";
                var status = card + ".status";

                await firestore
                    .collectionGroup(port_date)                                      
                    .where(status, "in", ["Using"])
                    .where(stage, "in", [STAGE_SENT])     
                    .get()
                    .then(async (querySnapshot) => {

                    size = querySnapshot.size;
                    console.log("size: "+ size);

                    if (size>0) {                   
                    
                        await querySnapshot.forEach(async (doc) => {

                            let status = doc.data()[_card].status; 

                            //console.log("status: " + status);

                            let operator = doc.data()[_card].operator;                   
                            let port = doc.id.match(/[0-9]+/g);                          
                            let using = `{"card":"${_card}","operator":"${operator}", "port":${port}}`;
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


       var searchByPort = function (nameKey, myArray){
            for (var i=0; i < myArray.length; i++) {
                if (myArray[i].port === nameKey) {
                    return myArray[i];
                }
            }
        }

       var callNextMovistarReceive =  async function(movistar_phones, movistar_data_receive) { 
                    
            let _id = movistar_phones[i];

            let _data = movistar_data_receive[i];
            var _card = _data.card;

            console.log("_id: " + _id);                  
            console.log("_card: " + _card);                  

            var option_movistar_receive = {
                method: "POST",
                uri: _urlm,
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

                console.log("results_send: " + JSON.stringify(results_receive));

                let portname = "port" + _result.port;
                let card = _result.card;
                let phone = _result.sim_number;                      

                let _json = `{"${card}":{"stage":${STAGE_RECEIVE},"phone":"${phone}"}}`;
                var jsonCards = JSON.parse(_json); 

                firestore
                    .collection("gateways")
                    .doc("S" + gateway)
                    .collection("ports_" + date)
                    .doc(portname)
                    .set(jsonCards, { merge: true });

                i++;

                if (i<=(moviLength-1)) {
                    //if (i<=3) {                       
                    console.log("--------------");
                    await timer(1000);
                    console.log("::: SENT :::  "+i);
                    callNextMovistarReceive(movistar_phones, movistar_data_receive);                            
                }


                return {};
            
            }).catch((error) => {
                console.log("error post: " + error);
                return error;
            });        
            
        }
        

        var GW_ReceiveSMS = async function(gateway, urls, date) {              
            
            let stageArray = await FB_StageProcessReceive(gateway, urls, date);             
            
            var claro_data_receive = [];
            var movistar_data_receive = [];
            
            var claro_phones = [];
            var movistar_phones = [];
            var personal_phones = [];

            for (var s in stageArray) {
                
              let stage = stageArray[s];             

              var operator = stage.operator;
              var card = stage.card;
              var port = parseInt(stage.port);              
              
              //console.log("operator: " + operator);
              
              if (operator === "Claro AR") {
                 claro_phones.push(port-1);                
                 claro_data_receive.push({ operator:operator, card:card, port:port });
              }

              if (operator === "Movistar") {
                 movistar_phones.push(port-1);                
                 movistar_data_receive.push({ operator:operator, card:card, port:port });
              }

              if (operator === "Personal") {
                personal_phones.push(port);                
              }              

            }            

            console.log();
            console.log("claro_data_receive: " + JSON.stringify(claro_data_receive));

            if ( claro_phones.length > 0 ) {

                    var _url = urls.url_base_remote + urls.params_ussdread;

                    //console.log("_url: " + _url);

                    var option_ussdread = {
                        method: "POST",
                        uri: _url,
                        body: {
                            data: {
                                "gateway": gateway,
                                "url": urls.url_ussd,
                                "channels": claro_phones,
                                "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                            },
                        },
                        json: true,
                    };

                    console.log();
                    console.log("option_ussdread: " + JSON.stringify(option_ussdread));

                    await rp(option_ussdread)
                        .then(async function (results_ussdread) {

                            //console.log("RESULT::: " + results_ussdread.length);

                            if (results_ussdread.length>0) { 
                                
                                //console.log("results_ussdread: " + JSON.stringify(results_ussdread));

                                var promises_state_receive = [];
                                var _gateway = "S" + gateway;
                                let _length = results_ussdread.length;                               

                                for (var i=0; i<_length; i++) {   

                                    let data = results_ussdread[i];
                                    let port = data.channel;
                                    let phone = data.phone;

                                    //console.log("data:" + JSON.stringify(data));

                                    let card = searchByPort(port, claro_data_receive);     
                                    
                                    //console.log("data:" + JSON.stringify(data));                                    
                                    
                                    let _json = `{"${card.card}":{"stage":${STAGE_RECEIVE},"phone":"${phone}"}}`;

                                    //console.log("*********************");                                    
                                    //console.log("_json: " + _json);                                    
                                    //console.log("*********************");

                                    var jsonCards = JSON.parse(_json);                                    
                                    let portname = "port" + port;                           

                                    promises_state_receive.push(
                                        firestore
                                            .collection("gateways")
                                            .doc(_gateway)
                                            .collection("ports_" + date)
                                            .doc(portname)
                                            .set(jsonCards, { merge: true })
                                    );
                                }

                                return Promise.all(promises_state_receive);

                            }

                            return {};
                                                       

                    }).catch((error) => {
                        console.log("error post: " + error);
                        return error;
                    });    

            }

            if ( movistar_phones.length > 0 ) {

                console.log("movistar_phones: " + JSON.stringify(movistar_phones));

                var _urlm = urls.url_base_remote + urls.params_received;

                console.log("_urlm: " + _urlm);

                var moviLength = movistar_phones.length;             

                var i=0;                
                
                callNextMovistarReceive(movistar_phones, movistar_data_receive);
            }            

        }

        //console.log("gateway_number: " + gateway_number);
        
        var _urls, _cards;

        var Start = async function(callback) {                                        
            callback(await FB_GetUrlsAndCards());
        }        

        var Collect = async function() {
            
            //await GW_CollectData(gateway_number, _urls, _cards, _date);
            
            console.log();
            console.log("GW_SendPhones");           
            await GW_SendPhones(gateway_number, _urls, _date);
            
            console.log();
            console.log("GW_ReceiveSMS");           
            await GW_ReceiveSMS(gateway_number, _urls, _date);
            
        }

        var STAGE_SENT_IDLE         = 1000;
        var STAGE_SENT              = 1001;
        var STAGE_SENT_FAILED       = 1002;
        var STAGE_SENT_TIMEOUT      = 1003;
        var STAGE_SENT_SENDING      = 1004;
        var STAGE_RECEIVE           = 1005;

        var GW_CollectData = async function(gateway, urls, cards, date) {                                              
            //let switch_promise = await SwitchCard(gateway_number, card, _date);                                            

            console.log();
            console.log("GW_CollectPorts");
            await GW_CollectPorts(urls, cards);                         
            console.log();

            console.log();
            console.log("GW_CollectStatus");
            await GW_CollectStatus(gateway, urls, date);
            console.log();

            console.log();
            console.log("GW_GetConsumptions");
            await GW_GetConsumptions(gateway, urls);                       
            console.log();

        } 
        
        var _date = getDateLabel();

        Start(function(resultsArrays){
            _urls = resultsArrays.urls;
            _cards = resultsArrays.cards;
            Collect();            
        });
        
        

    }
