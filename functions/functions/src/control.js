 
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

    var Sleep  = function (milliseconds) {
        console.log();        
        console.log("Sleep: " + milliseconds);                                                                      
        console.log();
        var start = new Date().getTime();
        for (var i = 0; i < 1e30; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    }

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

    var GetURLS = function () {
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

    var GW_CollectData = async function(gateway, date_ports) {   
        
        console.log("date_ports: " + date_ports);       

        try {     

            console.log();
            console.log("GW_CollectPorts");            
            await GW_CollectPorts(gateway, date_ports);                                               

            console.log();
            console.log("GW_CollectStatus");            
            await GW_CollectStatus(gateway, date_ports);           

            console.log();
            console.log("GW_GetConsumptions");
            await GW_GetConsumptions(gateway, date_ports);                                 
            console.log();
            
            return true;

        } catch (error) {

            console.error(error);
            return false;        
        }
    }  

    var GW_LockSwitch = async function (gateway_number, lock_switch_value) {

        let _urls = GetURLS();

        var _url = _urls.url_base_cloud_remote + _urls.params_lock_switch;

        var option_lock_switch = {
            method: "POST",
            uri: _url,
            body: {
                data: {
                    "gateway": gateway_number,
                    "url": _urls.url_lock_switch,
                    "value": lock_switch_value,
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

    var GW_SendPhones = async function(gateway, date_ports, card, STAGE) {  
        
        let _urls = GetURLS();
        
        //let usingArray = await FB_UsingPhones(gateway, date_ports);    
        
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

            var _url = _urls.url_base_cloud_remote + _urls.params_ussdsend;

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

    var GW_QueueSims = async function(cards, date_ports, STAGE) {             
        
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
                    var card = stage.card;
                    var port = parseInt(stage.port)-1;              
                    
                    console.log("operator: " + operator);
                    
                    if (operator === "Claro AR") {                        
                        
                        let json = { card:card, port:port };
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

    var ReadData = async function(gateway_number, date_ports) {    

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
                    
                    Sleep(200);

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

        Sleep(200);

        let read_body = {
            "action": READ_DATA,
            "gateway_number": gateway_number                                                                                           
        }                   

        let read_data = await PostProcess(url, read_body);

        console.log("read_data: " + read_data);

        Sleep(200);

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
                        
                        Sleep(200);

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


    exports.actions =  functions.runWith({timeoutSeconds: 500}).https.onRequest( async (req, res) =>  {    

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

                try {                         
                    
                    var action = req.body.action; 
                    var gateway_number = req.body.gateway_number;              
                    var _gateway_ = "S" + gateway_number;

                    var date_ports =  _gateway_ + "_Ports"; // + getDateLabel();

                    console.log("-----------------------");   
                    console.log("action: " + action);
                    console.log("_gateway_: " + _gateway_);

                    let card = "";
                    if (req.body.card!=undefined) {
                        card = req.body.card;
                        console.log("card: " + card);
                    }
                    /*let date_ports = "";
                    if (req.body.date_ports!=undefined) {
                        date_ports = req.body.date_ports;
                        console.log("date_ports: " + date_ports);
                    }*/                   
                    console.log("-----------------------");
                    let lock_switch_value = 0;
                    if (req.body.value!=undefined) {
                        lock_switch_value = req.body.value;
                        console.log("lock_switch_value: " + lock_switch_value);
                    }                   
                    console.log("-----------------------");
                    let STAGE = 0;
                    if (req.body.stage!=undefined) {
                        var _stage = req.body.stage;
                        console.log("_stage: " + _stage);
                        STAGE = GetStage(_stage);
                        console.log("STAGE: " + STAGE);
                    }                   
                    console.log("-----------------------");

                    let result;

                    switch (action) {                        
                        case COLLECT_DATA:
                            result = await GW_CollectData(gateway_number, date_ports);  
                            break;
                        case SWITCH_CARDS:
                            result = await SwitchCard(gateway_number, date_ports, card);
                            break;
                        case LOCK_SWITCH:
                            result = await GW_LockSwitch(gateway_number, lock_switch_value);  
                            break;
                        case SEND_DATA:
                            result = await GW_SendPhones(gateway_number, date_ports, card, STAGE);
                            break;
                        case READ_QUENUE:
                            result = await GW_QueueSims([card], date_ports, STAGE); 
                            break;
                        case READ_DATA:
                            result = await ReadData(gateway_number, date_ports); 
                            break;
                        case SAVE_QUENUE:
                            result = await SaveQueaue(date_ports, card); 
                            break;
                        case SAVE_DATA:
                            result = await SaveData(gateway_number, date_ports, card); 
                            break;
                    }

                    return res.status(200).send({"result":result}); 
                    
                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }

    });

    var PostProcess = async function(url, body) {

        var _url = url;

        console.log("_url:: " +  _url + " body: " + JSON.stringify(body));


        var promises_process = await new Promise( async (resolve, reject) => { 

            var options = {
                'method': 'POST',
                'url': _url + "/control-actions", 
                'headers': {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + bearer_key
                },
                body: JSON.stringify(body)
            };

            console.log("options>> " +  JSON.stringify(options));

            await rp(options)
                     .then(async function (results) {                  

                resolve(results);             
    
            }).catch((error) => {
                console.log("process error: " + error);
                reject(error);
            });
    
        });
        return promises_process;
    }

    var SwitchLock = async function(url, card, gateway_number) {

        console.log("SwitchLock url: " + url);

        let switch_body = {
            "action": SWITCH_CARDS,
            "gateway_number": gateway_number,
            "card":card                     
        }                   

        let switch_data = await PostProcess(url, switch_body);

        console.log("switch_data: " + switch_data);

        Sleep(200);

        let lock_switch_body = {
            "action": LOCK_SWITCH,
            "gateway_number": gateway_number,
            "value": 0                                                                   
        }                   

        let lock_switch_data = await PostProcess(url, lock_switch_body);

        console.log("lock_switch_data: " + lock_switch_data);

        Sleep(200);

        return;

    }

    var CollectSwitchLock = async function(url, card, gateway_number) {

        let collect_body = {
            "action": COLLECT_DATA,
            "gateway_number": gateway_number                        
        }                   

        let collect_data = await PostProcess(url, collect_body);

        console.log("collect_data: " + collect_data);

        Sleep(200);
        
        await SwitchLock(url, card, gateway_number);

        let collect_again_body = {
            "action": COLLECT_DATA,
            "gateway_number": gateway_number                        
        }                   

        let collect_again_data = await PostProcess(url, collect_again_body);

        console.log("collect_again_data: " + collect_again_data);

        Sleep(200);      
        
        return;

    }

    var Send = async function(url, card, gateway_number, stage) {

        let send_body = {
            "action": SEND_DATA,
            "gateway_number": gateway_number,
            "stage": stage,//"STAGE_SENT_IDLE"
            "card": card                                                                   
        }                   

        let send_data = await PostProcess(url, send_body);

        console.log("send_data: " + send_data);

        Sleep(200);   
        
        return;
    
    }  

    var Save = async function(url, card, gateway_number, stage) {

        let save_quenue_body = {
            "action": SAVE_QUENUE,
            "gateway_number": gateway_number,
            "card": card                                                                   
        }                   

        let save_quenue_data = await PostProcess(url, save_quenue_body);

        console.log("save_quenue_data: " + save_quenue_data);

        Sleep(200);     
    
        let save_body = {
            "action": SAVE_DATA,
            "gateway_number": gateway_number,
            "card": card                                                                   
        }                   

        let save_data = await PostProcess(url, save_body);

        console.log("save_data: " + save_data);

        Sleep(200);  

        return;
    }     
       
    var COLLECT_SWITCH_LOCK = 0;
    var SEND                = 1;
    var QUEAUE_READ         = 2;
    var SWITCH_LOCK         = 3;
    var SAVE                = 4;

    exports.process =  functions.runWith({timeoutSeconds: 500}).https.onRequest( async (req, res) =>  { 

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
                let local = req.body.local; 

                console.log("-----------------------");
                console.error("gateway_number: " + gateway_number);
                console.error("local: " + local);
                

                var _urls = GetURLS();

                let url = "";                
                if (local) {
                    url = _urls.url_base_local;
                } else {
                    url = _urls.url_base_remote;
                }

                console.error("url: " + url);

                console.log("-----------------------");

                let card = "";
                if (req.body.card!=undefined) {
                    card = req.body.card;
                    console.log("card: " + card);
                }                      
                
                let action = 0;
                if (req.body.action!=undefined) {
                    action = req.body.action;
                    console.log("action: " + action);
                } 

                let stage = "";
                if (req.body.stage!=undefined) {
                    stage = req.body.stage;
                    console.log("stage: " + stage);
                }

                try {  

                    switch (action) {
                        case COLLECT_SWITCH_LOCK:
                            await CollectSwitchLock(url, card, gateway_number);
                            break;
                        case SEND:
                            await Send(url, card, gateway_number, stage);                           
                            break;
                        case QUEAUE_READ:
                            await QueaueRead(url, card, gateway_number, stage);
                            break;     
                        case SWITCH_LOCK:
                            await SwitchLock(url, card, gateway_number);
                            break; 
                        case SAVE:
                            await Save(url, card, gateway_number);
                            break;
                    }           

                    return res.status(200).send({"completed":true}); 


                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }
    });


    exports.bond =  functions.runWith({timeoutSeconds: 500}).https.onRequest( async (req, res) =>  { 

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

                console.log("-----------------------");
                console.error("gateway_number: " + gateway_number);                

                var _urls = GetURLS();

                let local = false;
                if (req.body.local!=undefined) {
                    local = req.body.local;
                    console.log("local: " + local);
                } 

                let url = "";                
                if (local) {
                    url = _urls.url_base_local;
                } else {
                    url = _urls.url_base_remote;
                }

                url = url + "/control-process";

                console.error("url: " + url);

                console.log("-----------------------");

                let card = "";
                if (req.body.card!=undefined) {
                    card = req.body.card;
                    console.log("card: " + card);
                }     
                                               
                try {  

                    var collect_switch_lock = async function () {
                        let collect_switch_lock_body = {
                            "local": local,
                            "gateway_number": gateway_number,
                            "card": card,
                            "action": COLLECT_SWITCH_LOCK
                        };          
                        let collect_switch_lock_resutl = await PostProcess(url, collect_switch_lock_body);                
                        console.log("collect_switch_lock_resutl: " + collect_switch_lock_resutl);                
                        Sleep(200);    
                    }
                    
                    var send = async function (stage) {                    
                        let send_body = {
                            "local": local,
                            "gateway_number": gateway_number,
                            "card": card,
                            "action": SEND,
                            "stage": stage
                        }                
                        let send_resutl = await PostProcess(url, send_body);                
                        console.log("send_resutl: " + send_resutl);                
                        Sleep(200);
                    }

                    var queaue_read = async function (stage) {
                        let queaue_read_body = {
                            "local": local,
                            "gateway_number": gateway_number,
                            "card": card,
                            "action": QUEAUE_READ,
                            "stage": stage
                        }                
                        let queaue_read_resutl = await PostProcess(url, queaue_read_body);                
                        console.log("queaue_read_resutl: " + queaue_read_resutl);                
                        Sleep(200);
                    }

                    var save = async function (stage) {
                        let save_body = {
                            "local": local,
                            "gateway_number": gateway_number,
                            "card": card,
                            "action": SAVE
                        }   
                        let save_resutl = await PostProcess(url, save_body);                
                        console.log("save_resutl: " + save_resutl);                
                        Sleep(200);
                    }                

                    await collect_switch_lock();

                    await send("STAGE_SENT_IDLE");
                    
                    await queaue_read("STAGE_SENT");

                    await send("STAGE_NOT_RECEIVED");  
                    
                    await queaue_read("STAGE_SENT");         
                    
                    //save();
                    
                    return res.status(200).send({"completed":true}); 


                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }
        
    });

   
