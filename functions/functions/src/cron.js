    var rp = require('request-promise'); 
    
    var STAGE_SENT_IDLE         = 1000;
    var STAGE_SENT              = 1001;
    var STAGE_NOT_RECEIVED      = 1002;
    var STAGE_SENT_FAILED       = 1003;    
    var STAGE_RECEIVED          = 1004;   
    var STAGE_SAVED_NUMBER      = 1010;    

    var COLLECT_DATA    = "collect_data";
    var SWITCH_CARDS    = "switch_cards";
    var LOCK_SWITCH     = "lock_switch";
    var SEND_DATA       = "send_data";
    var READ_QUENUE     = "read_quenue";
    var READ_DATA       = "read_data";
    var SAVE_QUENUE     = "save_quenue";
    var SAVE_DATA       = "save_data";

    var GetStage = function (stage) {

        var _stage = 0;

        switch (stage) {
            case "STAGE_SENT_IDLE":
                _stage = 1000;
                break;   
            case "STAGE_SENT":
                _stage = 1001;
                break;        
            case "STAGE_NOT_RECEIVED":
                _stage = 1002;
                break;
            case "STAGE_SENT_FAILED":
                _stage = 1003;
                break;
            case "STAGE_RECEIVED":
                _stage = 1004;
                break;
            case "STAGE_SAVED_NUMBER":
                _stage = 1010;
                break;
        }

        return _stage;

    }

    GetURLS = function () {
        let _json = {
            url_managment : "/en/10-6SMSManagement.php",
            url_send : "/en/5-3-2SMSsend.php",
            url_base_local : "http://localhost:5001/noti-gateways/us-central1",
            url_using : "/en/5-9SIM.php",
            url_ussd : "/en/5-5USSD.php",
            params_send : "/backend/gateway/send",
            params_send_only : "/backend/gateway/sendonly",
            url_domain : ".notimation.com",
            url_base_remote : "https://us-central1-noti-gateways.cloudfunctions.net",
            url_base_cloud_remote : "https://us-central1-notims.cloudfunctions.net",
            params_lock_switch: "/backend/gateway/lockswitch",
            url_lock_switch : "/en/5-9-1SIMSet.php",
            params_status : "/backend/gateway/status",
            params_ussdsend : "/backend/gateway/ussdsend",
            params_ussdread : "/backend/gateway/ussdread",
            url_base : "http://s",
            parmas_using : "/backend/gateway/using",
            parmas_managment : "/backend/gateway/managment",
            url_status : "/en/1-2chstatus.php",
            params_received : "/backend/gateway/smsreceived",
            url_received : "/en/5-3-1SMSinfo.php?ch=",
            url_sendweb : "/backend/gateway/sendweb",
            url_save_phone : "/en/5-2-1mobilemodify.php?id=",
            params_save_phone : "/backend/gateway/savephone"
        };
        return _json;  
    };

    function sleep(milliseconds) {
        console.log();        
        console.log("SLEEP: " + milliseconds);                                                                      
        console.log();
        var start = new Date().getTime();
        for (var i = 0; i < 1e30; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    }

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

    var GW_CollectPorts = async function (cards, date_ports) {       

        var ps = [];

        let _urls = GetURLS();

        var uri_remote = _urls.url_base_cloud_remote + _urls.parmas_using;
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

            console.log("");
            console.log("NOT ARRAY");
            console.log("gateway: " + gateway);
            console.log("uri_remote: " + uri_remote);
            console.log("url_gateway: " + url_gateway);
            console.log("");           

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

        //console.log("GW_CollectPorts ps: " + JSON.stringify(ps));
        
        var _date_ = new Date();            

        await Promise.all(ps)
            .then((results) => {
            var promises_gateway = [];

            console.log();
            console.log("results: " + results.length);
            console.log();

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

    var GW_GetConsumptions = async function (gateway_number, date_ports) {
        
        var promises_managment = [];

        let _urls = GetURLS();

        let url = _urls.url_base_cloud_remote + _urls.parmas_managment;

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

        }).then(async (results_gateway) => {

            return promises_managment;                

        }).catch((error) => {
            console.log("error carajo: " + error);
            return error;
        });

        //console.log("FONDDOOOOO:");
        return promises_managment;
    };

    var GW_CollectStatus = async function (gateway_number, date_ports) {
        
        var promises_status = [];

        let _urls = GetURLS();

        let url = _urls.url_base_cloud_remote + _urls.params_status;

        console.log("url STATUS: " + url);

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

        console.log("option_status STATUS: " + JSON.stringify(option_status));

        console.log(JSON.stringify(option_status));

        await rp(option_status)
            .then(async function (results_status) {
                
            console.log(
                " ------ results_status ------- " + JSON.stringify(results_status)
            );

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
                
                if (operator == "---") {
                    operator = "Claro AR";
                };

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
            console.log("Error Status: " + error);
            return error;
        });

        //console.log("FONDDOOOOO:");
        return promises_status;
    };

    var GW_CollectData = async function(object) { //gateway, date_ports) { 

        let gateway_number = object.gateway_number;

        var date_ports = "S" + gateway_number + "_Ports";         
                
        console.log("date_ports: " + date_ports);       

        try {     

            console.log();
            console.log("GW_CollectPorts");            
            await GW_CollectPorts(gateway_number, date_ports);                                               

            console.log();
            console.log("GW_CollectStatus");            
            await GW_CollectStatus(gateway_number, date_ports);           

            console.log();
            console.log("GW_GetConsumptions");
            await GW_GetConsumptions(gateway_number, date_ports);                                 
            console.log();
            
            return true;

        } catch (error) {

            console.error(error);
            return false;        
        }
    }  

    var GW_LockSwitch = async function (object, lock) {

        var gateway_number = object.gateway_number;

        let _urls = GetURLS();

        var _url = _urls.url_base_cloud_remote + _urls.params_lock_switch;

        var option_lock_switch = {
            method: "POST",
            uri: _url,
            body: {
                data: {
                    "gateway": gateway_number,
                    "url": _urls.url_lock_switch,
                    "value": lock,
                    "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                },
            },
            json: true,
        };

        console.log();
        console.log("option_lock_switch: " + JSON.stringify(option_lock_switch));
        console.log();

        await rp(option_lock_switch)
            .then(async function (results_lock_switch) {
            
                return {"resutl":results_lock_switch};
            
        }).catch((error) => {                                            
            console.log("error post: " + error);                                          
            return {"error":error};
        });         

    };

    var SwitchCard = async function (object) { 

        let gateway_number = object.gateway_number;

        var date_ports = "S" + gateway_number + "_Ports";         
        let card = object.card;
        
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

                console.log("size: " + size);

                querySnapshot.forEach(async (doc) => {
                    
                    let parent = doc.ref.parent.parent;

                    console.log("parent: " + parent.id);
                    console.log("gateway: " + gateway);
                    console.log("------------------");
        
                    if (parent.id === gateway) {
                        //var gateway_number = parent.id.replace( /^\D+/g, '');
                        var port_number = doc.id.replace(/^\D+/g, "");

                        console.log("port_number: " + port_number);
            
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
            
                        console.log("options: " + JSON.stringify(options));
                        console.log("-------");
            
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

    var GW_SendPhones = async function(object, STAGE) { //} gateway, date_ports, card, STAGE) {  
        
        let _urls = GetURLS();

        let gateway_number = object.gateway_number;

        var date_ports = "S" + gateway_number + "_Ports";         
        let card = object.card;
        
        console.log("date_ports: " + date_ports);      
    
        var usingArray  = await FB_OperatorFromCard(card, date_ports, STAGE);
        if (usingArray.length > 0) {
            console.log("usingArray: " + JSON.stringify(usingArray));            
        } 
        
        var claro_data_sent = [];
        var movistar_data_sent = [];
        
        var claro_phones = [];
        var movistar_phones = [];
        var personal_phones = [];

        for (var u in usingArray) {
            
            let using = usingArray[u];             

            var operator = using.operator;
            var _card = using.card;
            var port = parseInt(using.port);           
            
            if (operator === "Claro AR") {
            claro_phones.push(port-1);                
            claro_data_sent.push({ operator:operator, card:_card, port:port });
            }

            if (operator === "Movistar") {
                movistar_phones.push(port-1);    
                movistar_data_sent.push({ operator:operator, card:_card, port:port });            
            }

            if (operator === "Personal") {
                personal_phones.push(port);                
            }

        }            
        
        if ( claro_phones.length > 0 ) {

            console.log();
            console.log("ENVIANDO CLARO");
            console.log();

            var _url = _urls.url_base_cloud_remote + _urls.params_ussdsend;

            //console.log("_url: " + _url);

            var option_ussdsend = {
                method: "POST",
                uri: _url,
                body: {
                    data: {
                        "gateway": gateway_number,
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
                        var _gateway = "S" + gateway_number;
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

    /*var FB_UsingPhones = async function (gateway_number, date_ports) {

        var usingAll = [];        

        var usingA  = await FB_OperatorFromCard("A", date_ports);
        if (usingA.length > 0) {
            console.log("usingA: " + JSON.stringify(usingA));            
        }            

        var usingB  = await FB_OperatorFromCard("B", date_ports);
        if (usingB.length > 0) {
            console.log("usingB: " + JSON.stringify(usingB));                
        }

        var usingC  = await FB_OperatorFromCard("C", date_ports);
        if (usingC.length > 0) {
            console.log("usingC: " + JSON.stringify(usingC));                
        }

        var usingD  = await FB_OperatorFromCard("D", date_ports);
        if (usingD.length > 0) {
            console.log("usingD: " + JSON.stringify(usingD));                
        }            

        usingAll.push(...usingA, ...usingB, ...usingC, ...usingD);

        //usingAll.sort(GetSortOrder("gateway"));

        //console.log("usingAll: " + JSON.stringify(usingAll));

        return usingAll;
        
    }*/

    var FB_OperatorFromCard = async function (card, date_ports, STAGE) {

        console.log("STAGE: " + STAGE);     
        console.log("date_ports: " + date_ports); 

        var _card = card;

        var usingArray = await new Promise( async (resolve, reject) => {

            var usings = [];

            var size = 0;
            var count = 0;

            var status = card + ".status";
            var _stage = card + ".stage";         

            await firestore
            .collectionGroup(date_ports)    
            //.where(status, "in", ["Using"])
            .where(_stage, "in", [STAGE]) //[STAGE_SENT_IDLE])                  
            .get().then(async (querySnapshot) => {

                size = querySnapshot.docs.length;
                console.log("size: "+ size);

                if (size>0) {                   
                
                    await querySnapshot.forEach(async (doc) => {

                        let _stage_ = parseInt(doc.data()[_card].stage); 

                        console.log("_stage_: " + _stage_);                        

                        let status = doc.data()[_card].status; 
                        
                        console.log("status: " + status);

                        let operator = doc.data()[_card].operator;
                        
                        console.log("operator: " + operator);

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

            console.log("stageAll: " + JSON.stringify(stageAll));
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

    var GW_QueueSims = async function(object, STAGE) {  

        let gateway_number = object.gateway_number;

        var date_ports = "S" + gateway_number + "_Ports";         
        let card = object.card;     
        
        let cards = [card];
        
        
        try  {
        
            let stageArray = await FB_StageProcessReceive(cards, date_ports, STAGE);             

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
                    var _card = stage.card;
                    var port = parseInt(stage.port)-1;              
                    
                    console.log("operator: " + operator);
                    
                    if (operator === "Claro AR") {                        
                        
                        let json = { card:_card, port:port };
                        //console.log("json: " + JSON.stringify(json));
                        let realPort = port+1;
                        var portName = "port" + realPort;

                        promises_queue.push(
                            firestore
                                .collection("automation")
                                .doc(date_ports)
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

    var FB_SentQueuedLimit = async function (date_ports) {        

        var queueArray = await new Promise( async (resolve, reject) => {

            var queued = [];
            var count  = 0;
        
            await firestore
                .collection("automation")
                .doc(date_ports)
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

            });                
            
        });  

        return queueArray;

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

    var CountQueue = async function (date_ports, queue_type) {
        var promises_queue = await new Promise( async (resolve, reject) => { 
            await firestore.collection("automation").doc(date_ports).collection(queue_type).get().then(snap => {   
                console.log("snap.size: " + snap.size);             
                resolve(snap.size);
            });
        });
        console.log("promises_queue: " + promises_queue);
        return promises_queue;
    }  

    var ReadData = async function(object) {    

        let gateway_number = object.gateway_number;

        var date_ports = "S" + gateway_number + "_Ports";         
        

        console.log();
        console.log("FB_SentQueuedLimit");
        console.log();  

        var count_queue = await CountQueue(date_ports, "queue_sent");        

        console.log();
        console.log("count_queue: " + count_queue);
        console.log();

        while (count_queue > 0) {

            /*let docau = await firestore.collection("automation").doc(date_ports).get();
                var count_read =  docau.data().count_read;    
                
            console.log();
            console.log("count_read: " + count_read);
            console.log();*/               

            let _urls = GetURLS();

            try 
            {
                                            
                var queue_limit = await FB_SentQueuedLimit(date_ports);

                var phones = [];     

                console.log();
                console.log("queue_limit: " + queue_limit.length);
                console.log();  

                if ( queue_limit.length > 0 ) {        
                    
                    for(var i=0; i<queue_limit.length; i++) {
                        let port = queue_limit[i].port;
                        phones.push(port);
                    }

                    var _url = _urls.url_base_cloud_remote + _urls.params_ussdread;

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
                                .collection(date_ports)
                                .doc(portname)
                                .set(jsonCards, { merge: true })
                        );                                        

                    }                                                   
                    
                    if (promises_state_receive.length > 0) {

                        await Promise.all(promises_state_receive).catch((error) => {                                            
                            console.log("error post: " + error);                                          
                            return error;
                        });

                    }   
                    
                    sleep(200);

                } 
            
            } catch (error) {

                console.error(error);              
                
            }

            count_queue = await CountQueue(date_ports, "queue_sent");

            console.log();
            console.log("count_queue: " + count_queue);
            console.log();

        }

    }

    var QueaueRead = async function(url, card, gateway_number, stage) {

        let quenue_body = {
            "action": READ_QUENUE,
            "gateway_number": gateway_number,
            "stage": stage,
            "card": card                                                                    
        }   
        
        console.log();
        console.log("quenue_body: " + JSON.stringify(quenue_body));
        console.log();

        let quenue_data = await PostProcess(url, quenue_body);

        console.log("quenue_data: " + quenue_data);

        sleep(200);

        let read_body = {
            "action": READ_DATA,
            "gateway_number": gateway_number                                                                                           
        }                   

        let read_data = await PostProcess(url, read_body);

        console.log("read_data: " + read_data);

        sleep(200);

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

    var SaveQueaue = async function(date_ports, card) {        

        var promises_save_number_queue = [];

        var numbers_array = await FB_PhoneNumbers([card], date_ports);              
        console.log("numbers_array: " + JSON.stringify(numbers_array));                               

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
                        .doc(date_ports)
                        .collection("queue_save_number")
                        .doc(portName)
                        .set(json, { merge: true })
                );
                
            }

            await Promise.all(promises_save_number_queue);               
            
            return true;
        }

        return false;  
        
    }



    var SaveData = async function(gateway_number, date_ports, card) {

        //DO THE POST                      

        console.log();
        console.log("FB_SaveQueuedLimit");
        console.log();

        var _urls = GetURLS();

        var count_queue_save_number = await CountQueue(date_ports, "queue_save_number");

        while (count_queue_save_number > 0) {

            try 
            {
                                            
                var send_queue_limit = await FB_SaveQueuedLimit(date_ports);
                
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

                        var _url = _urls.url_base_cloud_remote + _urls.params_save_phone;

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
                        console.log("date_ports: " + date_ports);
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
                                .collection(date_ports)
                                .doc(port_name)
                                .set(jsonCard, { merge: true })
                        ); 

                        await Promise.all(promises_save).catch((error) => {                                            
                            console.log("error post: " + error);                                          
                            return error;
                        });

                        if (count == (length_limit-1)) {                           

                            count_queue_save_number = await CountQueue(date_ports, "queue_save_number");

                            console.log();
                            console.log("count_queue_save_number: " + count_queue_save_number);
                            console.log();                                   

                        }

                        count++;
                        
                        sleep(200);

                    }

                } 

            } catch (error) {
                console.error("Error:: " + error);
                return false;        
            }

        }
    }

    var FB_SaveQueuedLimit = async function (date_ports) {        

        var queueArray = await new Promise( async (resolve, reject) => {

            var queued = [];
            var count  = 0;
        
            await firestore
                .collection("automation")
                .doc(date_ports)
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

    var SetStatus = async function(object, new_status, new_running) {

        let gateway_number = object.gateway_number;
        let card = object.card;

        let cards = object.cards;

        cards[card].status = new_status;
        cards[card].running = new_running;

        let _cards = {"cards":cards};

        console.log('_cards : ' + JSON.stringify(_cards));

        var gateway = "S" + gateway_number;

        await firestore
        .collection("gateways")
        .doc(gateway).set(_cards, {merge:true});

    }

    var RunCollectSend = async function(object) {   

        try { 

            await SetStatus(object, RUNNING_COLLECT_SEND, true);      

            await GW_CollectData(object); 

            await SwitchCard(object);        

            await GW_LockSwitch(object, LOCK_SWITCH_VALUE);

            await GW_SendPhones(object, STAGE_SENT_IDLE);

            await SetStatus(object, STATUS_COLLECTED, true);

            return true;

        } catch (error) {
            console.error(e);
            return error;                
        }    

    }

    var RunQueueRead = async function(object, status, stage) {

        try {

            await SetStatus(object, status, true);        
            
            let has_queue = await GW_QueueSims(object, stage); 

            if (has_queue) {

                await ReadData(object);
                
                await SetStatus(object, STATUS_READ, true);
            
            } else {

                await SetStatus(object, STATUS_STOPPED, false);

            }

            return true;

        } catch (error) {
            console.error(e);
            return error;                
        } 

    }

    var RunSend = async function(object, status, stage) { //gateway_number, card, cards, partial_status, stage) { 

        try {

            await SetStatus(object, status, true);   

            await GW_SendPhones(object, stage);  

            await SetStatus(object, STATUS_SENT, true);

            return true;

        } catch (error) {
            console.error(e);
            return error;                
        } 
        }

        let LOCK_SWITCH_VALUE   = 0;
        let UNLOCK_SWITCH_VALUE = 1;

        var STATUS_READY        = "ready";
        var STATUS_COLLECTED    = "collected";
        var STATUS_READ         = "read";
        var STATUS_SENT         = "sent";
        var STATUS_STOPPED      = "stopped";
        var STATUS_HOLD         = "hold";

        var RUNNING_COLLECT_SEND        = "running_collect_send";
        var RUNNING_QUEUE_READ          = "running_queue_read";
        var RUNNING_SEND                = "running_send";
        var RUNNING_QUEUE_NOT_RECEIVED  = "running_queue_not_received";

        var runGateway = async function (object) { 

        let gateway_number = object.gateway_number;
        let status = object.status;
        let card = object.card;

        let gateway = "S" + gateway_number;

        console.log();
        console.log('gateway : ' + gateway);  
        console.log('status  : ' + status);  
        console.log('card  : ' + card);
        console.log();

        let resutl = {};

        switch (status) {
            case STATUS_READY:                
                resutl = await RunCollectSend(object);                
            break;
            case STATUS_COLLECTED:                
                resutl = await RunQueueRead(object, RUNNING_QUEUE_READ, STAGE_SENT);
            break;
            case STATUS_READ:      
                resutl = await RunSend(object, RUNNING_SEND, STAGE_NOT_RECEIVED);
            break;    
            case STATUS_SENT:        
                resutl = await RunQueueRead(object, RUNNING_QUEUE_NOT_RECEIVED, STAGE_NOT_RECEIVED);
            break;                
        }

    }

    var GetCardsByGateway = async function(gateway) {

        let promise_gateway = await new Promise( async (resolve, reject) => {

            await firestore
                .collection("gateways")//.orderBy('gateways.cards')
                .doc(gateway).get()                
                .then(async (doc) => {

                let cards = doc.data().cards; 

                const ordered = Object.keys(cards).sort().reduce(
                    (obj, key) => { 
                    obj[key] = cards[key]; 
                    return obj;
                    }, 
                    {}
                );

                resolve(ordered);

            });

          
        });
        
        return promise_gateway;
    }

    var COUNT_IDLE          = 0;
    var PROCESS_IDLE        = 1000;
    var PROCESS_START       = 1002;
    var PROCESS_CONTINUE    = 1003;
    var PROCESS_STOPPED     = 1004;

    var TaskQueaue = async function(gateway_number) {

        let gateway = "S" + gateway_number;

        let cards = await GetCardsByGateway(gateway);

        console.log();
        console.log('cards : ' + JSON.stringify(cards));      
        console.log();

        var object = {        
            gateway_number:gateway_number
        };

        var cards_array = [];
        var process     = PROCESS_IDLE;
        //var count       = COUNT_IDLE;
        var id          = -1;

        Object.keys(cards).forEach(async function(key) {

            console.log();
            console.log('Key : ' + key + ', Value : ' + cards[key]);        

            let running = cards[key].running;
            let status = cards[key].status;

            let json_card = {
                gateway_number:gateway_number,
                key:key,
                card:cards[key]
            };

            cards_array.push(json_card);

            console.log();
            console.log('running : ' + running);  
            console.log('status  : ' + status);                         
                
            if ( (running == false) && (status == STATUS_READY) ) {

                //First start
                console.log();
                console.log("START: " + key);     
                
                process = PROCESS_START;
                

            } else if ( (running == false) && (status == STATUS_STOPPED ) ) {

                //Stopped
                console.log();
                console.log("STOPPED : " + key);

                process = PROCESS_STOPPED;
                               
            
            } else if (running == true) {

                //Continue
                console.log();
                console.log("CONTINUE : " + key);

                process = PROCESS_CONTINUE;
                              

            }  
            
            count++;
            id = count;

        });

        console.log();
        console.log("selected id: " + id);     
        console.log("cards_array[id] : " + JSON.stringify(cards_array[id]));  
        console.log();
                
        function getObject(id, cards_array) {

            let ready_json_card = cards_array[id];   
                
            let _object = {
                gateway_number : ready_json_card.gateway_number,
                card : ready_json_card.key,
                cards : cards
            };    
            
            return _object;

        }
        
        var json_card = {};
        var _object = {};

        if  ( (process==PROCESS_START) || (process==PROCESS_CONTINUE) ) {

            //Populate Run

            json_card = cards_array[id];        


        } else if (process==PROCESS_STOPPED) {

            console.log("(process==PROCESS_STOPPED)");

            //let card_length = cards.size;

            console.log("cards_array.length: " + cards_array.length );

            if (id >= (cards_array.length-1)) { //initial

                console.log("id--;");

                id--;
                
                _object = getObject(id, cards_array);              

            } else { //next

                console.log("id++;");

                id++;

                _object = getObject(id, cards_array);     
                               
            }

            console.log("_object: " + JSON.stringify(_object));

            //modify ready
            await SetStatus(_object, STATUS_HOLD, false);

            return false;            

        }
        
        let key = json_card.key;
        let card = json_card.card;
        let status = card.status;

        object.card = key;
        object.status = status;  

        object.cards = cards; 

        return object;

    }


    exports.G2 =  functions.pubsub.schedule('0 1 * * *').onRun(async context => {

        let object = await TaskQueaue(2);

        console.log("object: " + object);

        if (object!=false) {         

            await runGateway(object);

        }
        
    });

    exports.test =  functions.runWith({timeoutSeconds: 500}).https.onRequest( async (req, res) =>  { 

    res.set("Access-Control-Allow-Origin", "*");
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');         

    const key = req.headers.authorization.split('Bearer ')[1];

    if (key!=bearer_key) {
        res.status(403).send('Unauthorized');
    } else {       

        if (req.method === 'OPTIONS') {
            res.end();
        } else {                              
        
        var gateway_number = req.body.gateway_number;      
        var gateway = "S" + gateway_number; 
                                        
            try {  


                        

                let object = await TaskQueaue(2);
        
                console.log();
                console.log("object: " + JSON.stringify(object));
                console.log();

                
                //if (object!=false) {         

                    //await runGateway(object);

                //}
                
                //await runGateway(object);

            /*let promise_gateway = await new Promise( async (resolve, reject) => {

                await firestore
                    .collection("gateways")
                    .doc(gateway).get()
                    .then(async (doc) => {
        
                        var cards = doc.data().cards;                         

                        Object.keys(cards).forEach(async function(key) {
                        
                        console.log('Key : ' + key + ', Value : ' + cards[key]);

                        let old_status = cards[key];

                        console.log('old_status : ' + old_status);

                        switch (old_status) {
                            case "ready":
                            setRunning(gateway, cards, key, "running_collect_send");
                            break;
                        }                

                        })
        
                        resolve(cards);
                        
                    });
            });*/

            

            
                
                return res.status(200).send({"completed":true}); 


            } catch (e) {
                console.error(e);
                return res.status(400).send(error);                
            }

        }
    }

    });


    /*var runGateway = function (gateway) { 

    let promise_run_gateway = await new Promise( async (resolve, reject) => {

        let gateway = "S" + gateway;

        let cards = await GetCardsByGateway(gateway);

        console.log("cards : " + JSON.stringify(cards));

        Object.keys(cards).forEach(async function(key) {
        
            console.log('Key : ' + key + ', Value : ' + cards[key]);

            let old_status = cards[key];

            console.log('old_status : ' + old_status);

            let resutl = {};

            switch (old_status) {
                case STATUS_READY:                
                    resutl = await RunCollectSend(gateway, key, cards);                
                break;
                case STATUS_COLLECTED:                
                    resutl = await RunQueueRead(gateway, key, cards, "running_queue_read", STAGE_SENT);
                break;
                case STATUS_READ:      
                    resutl = await RunSend(gateway, key, cards, "running_send", STAGE_NOT_RECEIVED);
                break;    
                case STATUS_SENT:        
                    await RunQueueRead(gateway, key, cards, "running_queue_not_received", STAGE_NOT_RECEIVED);
                break;                
            }                

        });

    });

    }*/
