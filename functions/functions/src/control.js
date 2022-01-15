 
    var rp = require('request-promise'); 

    var STAGE_SENT_IDLE         = 1000;
    var STAGE_SENT              = 1001;
    var STAGE_NOT_RECEIVED      = 1002;
    var STAGE_SENT_FAILED       = 1003;    
    var STAGE_RECEIVED          = 1004;   
    var STAGE_SAVED_NUMBER      = 1010;

    var GetURLS = function () {
        let _json = {
            url_managment : "/en/10-6SMSManagement.php",
            url_send : "/en/5-3-2SMSsend.php",
            url_base_local : "http://localhost:5001/notims/us-central1",
            url_using : "/en/5-9SIM.php",
            url_ussd : "/en/5-5USSD.php",
            params_send : "/backend/gateway/send",
            params_send_only : "/backend/gateway/sendonly",
            url_domain : ".notimation.com",
            url_base_remote : "https://us-central1-notims.cloudfunctions.net",
            url_switch : "/en/5-9-1SIMSet.php",
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

    var GW_GetConsumptions = async function (gateway_number, date_ports) {
        
        var promises_managment = [];

        let _urls = GetURLS();

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

    var GW_CollectStatus = async function (gateway_number, date_ports) {
        
        var promises_status = [];

        let _urls = GetURLS();

        let url = _urls.url_base_remote + _urls.params_status;

        console.log("url: " + url);

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

    var GW_SendPhones = async function(gateway, date_ports, card) {  
        
        let _urls = GetURLS();
        
        //let usingArray = await FB_UsingPhones(gateway, date_ports);    
        
        var usingArray  = await FB_OperatorFromCard(card, date_ports);
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
    
    var FB_UsingPhones = async function (gateway_number, date_ports) {

        var usingAll = [];        

        var usingA  = await FB_OperatorFromCard("A", date_ports);
        if (usingA.length > 0) {
            console.log("usingA: " + JSON.stringify(usingA));            
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

                        console.log("stage: " + stage);                        

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
    
    exports.actions =  functions.https.onRequest( async (req, res) =>  {    

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

                    var _date_ports = "ports_" + _gateway_ + "_" + getDateLabel();

                    console.log("-----------------------");   
                    console.log("action: " + action);
                    console.log("_gateway_: " + _gateway_);
                    let card = "";
                    if (req.body.card!=undefined) {
                        card = req.body.card;
                        console.log("card: " + card);
                    }
                   
                    console.log("-----------------------");

                    let result;

                    switch (action) {
                        case "collect_data":
                            result = await GW_CollectData(gateway_number, _date_ports);  
                            break;
                        case "switch_cards":
                            result = await SwitchCard(gateway_number, _date_ports, card);
                            break;
                        case "send_data":
                            result = await GW_SendPhones(gateway_number, _date_ports, card);
                            break;
                    }

                    
                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }

    });