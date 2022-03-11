    var rp = require('request-promise'); 

    let LOCK_SWITCH_VALUE   = 0;
    let UNLOCK_SWITCH_VALUE = 1;

    var STATUS_READY                = "ready";
    var STATUS_INIT_COLLECTED       = "init_collected";
    var STATUS_CARD_COLLECTED       = "card_collected";

    var STATUS_NOT_COLLECTED       = "not_collected";

    var STATUS_SWITCHED_LOCKED      = "switch_locked";
    var STATUS_READ                 = "read";
    var STATUS_SENT                 = "sent";
    var STATUS_SENT_AGAIN           = "sent_again";
    var STATUS_STOPPED              = "stopped";
    var STATUS_HOLD                 = "hold";
    var STATUS_SAVE_QUENUE          = "save_quenue";
    var STATUS_SAVE_DATA            = "save_data";
    
    var STATUS_CHECK_FINISH         = "check_finish";
    var STATUS_FINISH_INCOMPLETE    = "check_finish_incomplete";
    var STATUS_FINISH_COMPLETE      = "status_finish_complete";

    var RUNNING_COLLECT_INIT        = "running_collect_init";
    var RUNNING_COLLECT_SWITCH      = "running_collect_switch";
    var RUNNING_COLLECT_SEND        = "running_collect_send";
    var RUNNING_SWITCH_LOCK         = "running_switch_lock";
    var RUNNING_QUEUE_READ          = "running_queue_read";
    var RUNNING_SEND                = "running_send";
    var RUNNING_QUEUE_AGAIN         = "running_queue_again";
    var RUNNING_SAVE_QUENUE         = "running_save_quenue";
    var RUNNING_SAVE_DATA           = "running_save_data";

    var RUNNING_CHECK_FINISH        = "running_check_finish";

    var STAGE_SENT_COLLECTED    = 1000;
    var STAGE_SENT_IDLE         = 1001;
    var STAGE_SENT              = 1002;
    var STAGE_NOT_RECEIVED      = 1003;
    var STAGE_RECEIVED          = 1004;   
    var STAGE_SAVED_NUMBER      = 1015;  
    var STAGE_DISTINCT_TO       = 1006;        

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

    var GetReceivedPorts = async function(object) { //card, gateway_number) {   
        
        let gateway_number = object.gateway_number;

        var date_ports = "S" + gateway_number + "_Ports";         
        var card = object.card; 

        var init =  object.init;

        console.log("init :>>>>>>>>>>>>> " + init);

        let promise_received_array = await new Promise( async (resolve, reject) => {

            var _stage = card + ".stage";            

            await firestore
            .collectionGroup(date_ports)            
            .where(_stage, "in", [STAGE_RECEIVED])          
            .get().then(async (querySnapshot) => {

                size = querySnapshot.docs.length;
                console.log("size: "+ size);

                if (size==0) {

                    resolve({
                        "card" : card,
                        "received_array" : [],
                        "init":init
                    });

                } else {
 
                    var count = 0;
                    var received_array = [];

                    if (size>0) {                   
                    
                        await querySnapshot.forEach(async (doc) => {

                            let port = doc.id.match(/[0-9]+/g);

                            let p = parseInt(port);

                            received_array.push(p);

                            if (count==(size-1)) {

                                resolve({
                                    "card" : card,
                                    "received_array" : received_array,
                                    "init":init
                                });
                            }                       

                            count++;

                        });
                    }

                }

            });
        
        });
        
        
        return promise_received_array;
    }

    var GW_CollectPorts = async function (object) { //cards, date_ports) {  
        
        let gateway_number = object.gateway_number;

        var date_ports = "S" + gateway_number + "_Ports";         
        
        var card = object.card;

        var ps = [];

        let _urls = GetURLS();

        var uri_remote = _urls.url_base_cloud_remote + _urls.parmas_using;        

        console.log();
        console.log("uri_remote> "+ uri_remote);
        console.log();

        /*if (Array.isArray(cards)) {

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
        
        } else {*/

            //var gateway = cards;                   

            let options = {
                method: "POST",
                uri: uri_remote,
                body: {
                    data: {
                        gateway: gateway_number,
                        url: _urls.url_using,
                        autorization: "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                    },
                },
                json: true,
            };
            ps.push(rp(options));

        //}   

        var promises_sims = [];

        console.log();
        console.log("ps: " + JSON.stringify(ps));
        console.log();

        //Ports that already have number.
        var received_ports = {};
        
        if (object.init==false) {
            received_ports = await GetReceivedPorts(object);    
        }            
        
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

                    var port = parseInt(obj.port);
                    var portName = "port" + port;
                    var jsonCards = `{`;
                    var countAdded = 0;

                    obj.channel.forEach(async (channel) => { 

                        var  _status_ = STAGE_SENT_IDLE; 
                        
                        //var init = received_ports.init; 
                        var init = object.init; 
                        let include = false;

                        if (init) {
                            
                            include=true;                            
                            
                        } else {

                            if  (card==channel) {
                                include=true;

                                var received_array = received_ports.received_array;    
                            
                                if (received_array.length>0) {
                                
                                    var received_card = received_ports.card;                        
                                    if (channel == received_card) {
                                        if (received_array.contains(port)) {
                                            _status_ = STAGE_RECEIVED;
                                        }
                                    } 

                                } 
                            }              

                        }

                        console.log();
                        console.log("######################################");
                        console.log("init: " + init);
                        console.log("_status_: " + _status_);
                        console.log("include: " + include);
                        console.log("port: " + port);
                        console.log("card: " + card);                        
                        console.log();

                        if (include) {                                    

                            if (channel.status === "Using") {
                                jsonCards += `"${channel.card}":{"status":"${channel.status}","stage":${_status_}}`;
                            } else {
                                jsonCards += `"${channel.card}":{"status":"${channel.status}","stage":${STAGE_SENT_COLLECTED}}`;
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
                                
                                let stop_init = object.stop_init;
                                if (stop_init) {

                                    promises_sims.push(
                                        firestore
                                        .collection("gateways")
                                        .doc(gateway)
                                        .set({"init":false}, { merge: true }));
                                        
                                }

                            } else {
                                jsonCards += `,`;
                                countAdded++;
                            }
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

        //console.log("url STATUS: " + url);

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

        //console.log("option_status STATUS: " + JSON.stringify(option_status));

        console.log(JSON.stringify(option_status));

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
                
        //console.log("date_ports: " + date_ports);       

        try {     

            //console.log();
            console.log("GW_CollectPorts");            
            await GW_CollectPorts(object);                                               

            //console.log();
            console.log("GW_CollectStatus");            
            await GW_CollectStatus(gateway_number, date_ports);           

            //console.log();
            console.log("GW_GetConsumptions");
            await GW_GetConsumptions(gateway_number, date_ports);                                 
            //console.log();
            
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

        //console.log();
        //console.log("option_lock_switch: " + JSON.stringify(option_lock_switch));
        //console.log();

        await rp(option_lock_switch)
            .then(async function (results_lock_switch) {
            
                return {"resutl":results_lock_switch};
            
        }).catch((error) => {                                            
            console.log("error post: " + error);                                          
            return {"error":error};
        });         

    };

    var SwitchCard = async function (object) { 

        console.log("object SwitchCard: " + JSON.stringify(object)); 

        let gateway_number = object.gateway_number;

        var date_ports = "S" + gateway_number + "_Ports";         
        var card = object.card;
        
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

                    //console.log("parent: " + parent.id);
                    //console.log("gateway: " + gateway);
                    //console.log("------------------");
        
                    if (parent.id === gateway) {
                        //var gateway_number = parent.id.replace( /^\D+/g, '');
                        var port_number = doc.id.replace(/^\D+/g, "");

                        //console.log("port_number: " + port_number);
            
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
        
        //console.log("date_ports: " + date_ports);      

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
            console.log("claro_phones: " + JSON.stringify(claro_phones));
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

            //console.log();
            //console.log("option_ussdsend: " + JSON.stringify(option_ussdsend));
            //console.log();

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

        var _card = card;

        var usingArray = await new Promise( async (resolve, reject) => {

            var usings = [];

            var size = 0;
            var count = 0;

            var status = card + ".status";
            var port = card + ".stage";  
            
            var query = {};

            if (STAGE==STAGE_DISTINCT_TO) {
              
                console.log("(STAGE==STAGE_DISTINCT_TO)");
                console.log();
                
                query = await firestore
                .collectionGroup(date_ports)     
                .where(port, "not-in",  [STAGE_RECEIVED])   

            } else {

                query = await firestore
                .collectionGroup(date_ports)             
                .where(port, "in",  [STAGE]) 

            }

            console.log("____________________________");  
            console.log("_card: " + _card);     
            console.log("STAGE: " + JSON.stringify(STAGE));             
            console.log();

                    
            query.get().then(async (querySnapshot) => {

                size = querySnapshot.docs.length;
                console.log("size: "+ size);
                console.log();

                if (size>0) {                   
                
                    await querySnapshot.forEach(async (doc) => {

                        let _stage_ = parseInt(doc.data()[_card].stage); 

                        console.log("_stage_: " + _stage_);                        

                        let status = doc.data()[_card].status; 
                        
                        console.log("status: " + status);

                        let operator = doc.data()[_card].operator;
                        
                        console.log("operator: " + operator);

                        let port = doc.id.match(/[0-9]+/g);   
                        
                        console.log("port: " + port);

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

        console.log("-----------------------");
        console.log("card: " + card);
        console.log("port_date: " + port_date);


        var usingArray = await new Promise( async (resolve, reject) => {

            var stages = [];

            var size = 0;
            var count = 0;

            var stage = card + ".stage";
            var status = card + ".status";
            var phone = card + '.phone';

            await firestore
                .collectionGroup(port_date)                                      
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

        console.log("///////////////////////////////////");
        console.log("cards: " + JSON.stringify(cards));
        console.log("date_ports: " + date_ports);

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

    var SaveQueaue = async function(object, status_running, status, cycle) {   
        
        object.cycle = cycle;

        await SetStatus(object, status_running, cycle, true); 
        
        let gateway_number  = object.gateway_number;
        var date_ports      = "S" + gateway_number + "_Ports";         
        let card            = object.card;

        //console.log();
        //console.log("card...............: " + card);
        //console.log("date_ports...............: " + date_ports);

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

                console.log("json> " + JSON.stringify(json));

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
            
            await SetStatus(object, status, cycle, true);
            
            return true;
        }        

        return false;  
        
    }


    var SaveData = async function(object, status_running, status, cycle) {

        await SetStatus(object, status_running, cycle, true); 

        let gateway_number = object.gateway_number;
        var date_ports = "S" + gateway_number + "_Ports";        

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

        await SetStatus(object, status, cycle, true);
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

    var SetStatus = async function(object, new_status, cycle, new_running) {

        let gateway_number = object.gateway_number;
        let card = object.card;

        let cards = object.cards;

        cards[card].status = new_status;
        cards[card].running = new_running;
        cards[card].cycle = cycle;

        if (object.finish) {
            cards[card].finish = object.finish;
        }      

        let _cards = {"cards":cards};

        console.log('_cards : ' + JSON.stringify(_cards));
        console.log();

        var gateway = "S" + gateway_number;

        await firestore
        .collection("gateways")
        .doc(gateway).set(_cards, {merge:true});

    }    

    var RunSwitchLock = async function(object, cycle) {  
        
        try { 

            await SetStatus(object, RUNNING_SWITCH_LOCK, cycle, true);          

            await SwitchCard(object);         

            await GW_LockSwitch(object, LOCK_SWITCH_VALUE);

            console.log('GW_LockSwitch(object, LOCK_SWITCH_VALUE);');

            await SetStatus(object, STATUS_SWITCHED_LOCKED, true);       
            
            return true;

        } catch (error) {
            console.error(e);
            return error;                
        }       

    }

    var RunCollect = async function(object, status_running, status, cycle) {   

        try { 

            await SetStatus(object, status_running, cycle, true);

            if (status_running == RUNNING_COLLECT_SEND) {
                object.stop_init = true;
            }
            
            await GW_CollectData(object); 

            console.log('GW_CollectData(object);');

            await SetStatus(object, status, cycle, true); 

            return true;

        } catch (error) {
            console.error(e);
            return error;                
        }    

    }

    var RunQueueRead = async function(object, status_running, status, stage, cycle) {

        try {

            await SetStatus(object, status_running, cycle, true);       
            
            await GW_QueueSims(object, stage); 

            await ReadData(object);
            
            await SetStatus(object, status, cycle, true);            
         
            return true;

        } catch (error) {
            console.error(e);
            return error;                
        } 

    }

    var RunSend = async function(object, status_running, status, stage, cycle) { 

        try {

            object.cycle = cycle;

            await SetStatus(object, status_running, cycle, true);  

            await GW_SendPhones(object, stage);  

            console.log('GW_SendPhones(object, stage);');

            await SetStatus(object, status, cycle, true);

            return true;

        } catch (error) {
            console.error(e);
            return error;                
        } 
    }

    var ClearUSSD = async function (gateway_number, channels) {

        let _urls = GetURLS();

        let url = _urls.url_base_cloud_remote + _urls.params_ussdclear;

        console.log("url: " + url);
    
        var option_clear = {
            method: "POST",
            uri: url,
            body: {
                data: {
                    gateway: gateway_number,
                    channels : channels,
                    url : _urls.url_ussd,
                    autorization : "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                },
            },
            json: true,
        };

        console.log(JSON.stringify(option_clear));

        await rp(option_clear)
            .then(async function (results_clear) {

                return results_clear;
            
        }).catch((error) => {                                            
            console.log("error post: " + error);                                          
            return {"error":error};
        }); 

    }

    var CheckFinishAndClear = async function(object) { 

        try {

            await SetStatus(object, RUNNING_CHECK_FINISH, true);  
            
            var card = object.card;    
            var gateway_number = object.gateway_number;   
            var date_ports = "S" + gateway_number + "_Ports";
            var card = object.card;   

            var finish_array_promise = await new Promise( async (resolve, reject) => {       

                var size = 0;
                var stage = card + ".stage";       
                
                await firestore
                    .collectionGroup(date_ports)
                    //.where(card, "not-in",  [STAGE_RECEIVED])   
                    .get().then(async (querySnapshot) => {   
                    
                    size = querySnapshot.docs.length;
                    var count = 0;

                    var ports_array = [];

                    if (size>0) {                   
                
                        await querySnapshot.forEach(async (doc) => {
                                                                
                            let port = doc.id.match(/[0-9]+/g); 
                            
                            let _stage_ = parseInt(doc.data()[card].stage); 

                            /*if (_stage_!=STAGE_RECEIVED) {
                                let p = parseInt(port);
                                console.log("p: " + p);
                                ports_array.push(p);
                            }*/

                            console.log();
                            console.log("******* OTHER THAN ********");   
                            console.log("cycle :"  + cycle);     
                            console.log("_stage_ :"  + _stage_);  
                            console.log("*************************");
                            console.log(); 

                            if (( cycle == CYCLE_COLLECT ) && ( _stage_ != STAGE_SENT_IDLE )) {

                                CYCLE_COLLECT_NOT_STAGE_SENT_IDLE = true;
                                CYCLE_READ_NOT_STAGE_RECEIVED     = false;
                                CYCLE_SAVE_NOT_STAGE_SAVED_NUMBER = false;

                            } else if (( cycle == CYCLE_READ )    && ( _stage_ != STAGE_RECEIVED  )) {

                                CYCLE_COLLECT_NOT_STAGE_SENT_IDLE = false;
                                CYCLE_READ_NOT_STAGE_RECEIVED     = true;
                                CYCLE_SAVE_NOT_STAGE_SAVED_NUMBER = false;

                            } else if (( cycle == CYCLE_SAVE )    && ( _stage_ != STAGE_SAVED_NUMBER )) {
                                
                                CYCLE_COLLECT_NOT_STAGE_SENT_IDLE = false;
                                CYCLE_READ_NOT_STAGE_RECEIVED     = false;
                                CYCLE_SAVE_NOT_STAGE_SAVED_NUMBER = true;

                            }

                            if (
                                CYCLE_COLLECT_NOT_STAGE_SENT_IDLE   ||
                                CYCLE_READ_NOT_STAGE_RECEIVED       ||
                                CYCLE_SAVE_NOT_STAGE_SAVED_NUMBER
                                ) {

                                console.log();
                                console.log("****** ENTERED!! *********"); 
                                console.log();

                                let p = parseInt(port);
                                console.log("p: " + p);
                                ports_array.push(p);

                            }

                            if (count==(size-1)) {
                                resolve(ports_array);
                            }

                            count++;
                            
                        });

                    }  else {
                        resolve(ports_array);
                    }           
                
                }).catch((error) => {
                    console.log("error carajo: " + error);
                    return error;
                });
                
            });  

            let finish_array = finish_array_promise;     
            
            console.log();
            console.log("finish_array: " + JSON.stringify(finish_array));

            //NOT FINISHED
            if (finish_array.length > 0) {
                
                //await ClearUSSD(gateway_number, finish_array);

                //object.finish = STATUS_FINISH_INCOMPLETE;    
                
                await SetStatus(object, STATUS_NOT_COLLECTED, true);
                         
            }  else {

                //object.finish =  STATUS_FINISH_COMPLETE;

                await SetStatus(object, STATUS_SAVE_QUENUE, true);

            }             

            return true;

        } catch (error) {
            console.error(error);
            return error;                
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

    var GetCardsByGateway = async function(gateway) {

        let promise_gateway = await new Promise( async (resolve, reject) => {

            await firestore
                .collection("gateways")//.orderBy('gateways.cards')
                .doc(gateway).get()                
                .then(async (doc) => {

                let cards = doc.data().cards;
                let init = doc.data().init;  
                
                const ordered = Object.keys(cards).sort().reduce(
                    (obj, key) => { 
                    obj[key] = cards[key]; 
                    return obj;
                    }, 
                    {}
                );

                let _response_ = {
                    "init" : init,
                    "cards" : ordered
                }

                resolve(_response_);
            });

        
        });
        
        return promise_gateway;
    }

    var PROCESS_IDLE        = 1000;
    var PROCESS_START       = 1002;
    var PROCESS_CONTINUE    = 1003;
    var PROCESS_STOPPED     = 1004;

    var TaskQueaue = async function(gateway_number) {

        let gateway = "S" + gateway_number;

        let cards_by_gateway = await GetCardsByGateway(gateway);

        var cards = cards_by_gateway.cards;
        var init = cards_by_gateway.init;

        console.log();
        console.log('cards : ' + JSON.stringify(cards));      
        console.log();

        var object = {        
            gateway_number:gateway_number
        };

        var cards_array = [];
        var process     = PROCESS_IDLE;
        var id          = -1;
        var selected_id = -1;

        function consoleSelected(status, key) {
            console.log();
            console.log("******* SELECTED ********");   
            console.log(status + ":  " + key);     
            console.log("*************************");
            console.log();
        }

        Object.keys(cards).forEach(async function(key) {

            id++;

            console.log();
            console.log('Key : ' + key + ', Value : ' + JSON.stringify(cards[key]));        

            let running = cards[key].running;
            let status = cards[key].status;

            let json_card = {
                id:id,
                gateway_number:gateway_number,
                key:key,
                card:cards[key]                
            };

            cards_array.push(json_card);

            console.log();
            console.log('running : ' + running);  
            console.log('status  : ' + status);     
            console.log();                    
                
            if ( (running == false) && (status == STATUS_READY) ) {

                //First start
                consoleSelected("START STATUS_READY: '" + status + "'", key);
                process = PROCESS_START;
                selected_id = id;                

            } else if ( (running == false) && (status == STATUS_STOPPED ) ) {

                //Stopped
                console.log();
                consoleSelected("STOPPED: '" + status + "'", key);
                process = PROCESS_STOPPED;
                selected_id = id;                                 
            
            } else if (running == true) {

                //Continue               
                consoleSelected("CONTINUE: '" + status + "'", key);
                process = PROCESS_CONTINUE; 
                selected_id = id;                              

            }                  

        });

        console.log();
        console.log("selected id: " + selected_id);     
        console.log("selected Card: " + cards_array[selected_id].key); 
        console.log("cards_array[selected_id] : " + JSON.stringify(cards_array[selected_id]));  
        console.log("--------------------------------------------------------------------");
                
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
        var next_object = {};

        if  ( (process==PROCESS_START) || (process==PROCESS_CONTINUE) ) {

            //Populate Run
            json_card = cards_array[selected_id];

        } else if (process==PROCESS_STOPPED) {            
            
            console.log();
            console.log("PROCESS_STOPPED");
            console.log();
            console.log("selected_id: " + selected_id + " cards_array.length: " + cards_array.length );
            console.log();

            let current_object = getObject(selected_id, cards_array);
            await SetStatus(current_object, STATUS_HOLD, false);

            if (selected_id >= (cards_array.length-1)) { //initial

                console.log("id--;");
                selected_id--;
                
                
            } else { //next                

                console.log("id++;");
                selected_id++;
                                        
            }

            next_object = getObject(selected_id, cards_array); 
            await SetStatus(next_object, STATUS_READY, false);     

            console.log();
            console.log("next_object: " + JSON.stringify(next_object));
            console.log();

            return false;            

        }
        
        let key = json_card.key;
        let card = json_card.card;
        let status = card.status;

        object.card = key;
        object.status = status; 
        object.cards = cards; 
        object.init = init;
        
        return object;

    }

    var ExecuteGateway = async function(gateway) {

        let object = await TaskQueaue(gateway);

        console.log("object: " + object);

        if (object!=false) {         

        let result_gateway = await RunGateway(object);

        console.log("result_gateway:" + result_gateway);

        }
    }

    var CYCLE_IDLE               = "cycle_idle";
    var CYCLE_COLLECT            = "cycle_collect";
    var CYCLE_READ               = "cycle_read";
    var CYCLE_SAVE               = "cycle_save";

    var RunGateway = async function (object) { 

        let gateway_number = object.gateway_number;
        let status = object.status;
        let card = object.card;

        let gateway = "S" + gateway_number;

        console.log();
        console.log("+++++++++++++RunGateway+++++++++++");
        console.log('       gateway : ' + gateway);  
        console.log('       status  : ' + status);  
        console.log('       card    : ' + card);
        console.log("++++++++++++++++++++++++++++++++++");
        console.log();

        let result = {};

        switch (status) {
            case STATUS_READY:                
                result = await RunCollect(object, RUNNING_COLLECT_INIT,  STATUS_INIT_COLLECTED, CYCLE_COLLECT);                
            break;
            case STATUS_INIT_COLLECTED: 
                result = await RunSwitchLock(object, CYCLE_COLLECT);
            break;
            case STATUS_SWITCHED_LOCKED:                
                result = await RunCollect(object, RUNNING_COLLECT_SEND, STATUS_CHECK_FINISH, CYCLE_COLLECT);                 
            break;
            case STATUS_CHECK_FINISH:
                result = await CheckFinishAndClear(object);
            break;
            case STATUS_NOT_COLLECTED: 
                result = await RunSend(object, RUNNING_SEND, STATUS_SENT, STAGE_DISTINCT_TO, CYCLE_READ);                
            break;
            case STATUS_SENT:      
                result = await RunQueueRead(object, RUNNING_QUEUE_READ, STATUS_CHECK_FINISH, STAGE_SENT, CYCLE_READ);
            break;
            case STATUS_SAVE_QUENUE:
                result = await SaveQueaue(object, RUNNING_SAVE_QUENUE, STATUS_SAVE_DATA, CYCLE_SAVE); 
            break;
            case STATUS_SAVE_DATA:
                result = await SaveData(object, RUNNING_SAVE_DATA, STATUS_CHECK_FINISH, STAGE_SENT); 
                break;            
        }

        return result;
    }

    exports.G2 =  functions.pubsub.schedule('0 1 * * *').onRun(async context => {

        await ExecuteGateway(2);
        
    });

    exports.G3 =  functions.pubsub.schedule('0 1 * * *').onRun(async context => {

        await ExecuteGateway(3);
        
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

                    /*let object = await TaskQueaue(2);

                    let object = {
                        card:"C",
                        gateway_number:2
                    };*/

                    console.log();
                    console.log();
                    console.log("*********************");
                    console.log("********START********");
                    console.log("*********************");
                    console.log();
                   
                    let object = await TaskQueaue(2);

                    console.log();
                    console.log("OBJECT:::: " + JSON.stringify(object));

                    if (object!=false) {         

                        let result_gateway = await RunGateway(object);

                        console.log("result_gateway:" + result_gateway);

                    }
            
                    /*let finish = await CheckFinishAndClear(object, 1);

                    console.log();
                    console.log("finish: " + finish);
                    console.log();*/

                    //let received = await GetReceivedPorts("A", 2);

                    //console.log();
                    //console.log("received: " + JSON.stringify(received));
                    //console.log();

                    //let clear = await ClearUSSD(2);

                    //console.log();
                    //console.log("clear: " + clear);
                    //console.log();

                    //if (object!=false) {         

                        //await RunGateway(object);

                    //}
                    
                    //await RunGateway(object);

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

