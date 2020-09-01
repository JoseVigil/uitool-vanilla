      
    var firestoreService = require('firestore-export-import');      
    var rp = require("request-promise");

    firestoreService.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,        
    });  

    /** action */

    var ACTION_EXPORT  = 'export';            
    
    action = async function(req, res) { 

        let action = req.path.split('/')[2]; 
        var collection = req.body.data.collection;         
        console.log("action: " + action);

        switch (action) {

            case ACTION_EXPORT:                                     
                try {    
                firestoreService
                .backup(collection)
                .then(data => {  
                    return res.status(200).send(data);          
                }).catch((error) => {                
                    console.log('Error getting sertvice backup');
                    return res.status(400).send(error);                
                });               
                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }    
            break;                             

            default:  
            res.status(402).send("Action not found");
            break;
        }                   
    }; 

    /** gateway */

    var GATEWAY_USING                = 'using';
    var GATEWAY_SWITCH               = 'switch';
    var GATEWAY_SMS_RECEIVED         = 'received';
    var GATYEWAY_SMS_SEND_AND_RECEIVE = 'sendreceive';   
    var GATYEWAY_REBOOT  = 'reboot';  

    gateway = async function(req, res) {
    
        console.log("gateway: " + req.path.split('/')[2]);      
        
        switch (req.path.split('/')[2]) {      

            case GATEWAY_USING: {           
                console.log("url_remote: " + req.body.data.url_remote);     
                let uurl = req.body.data.url_remote; //'https://us-central1-notims.cloudfunctions.net/backend/gateway/using';          
                return using(req, res, uurl);          
            }
            
            case GATEWAY_SWITCH: 
                switchsim(req, res); 
            break;        

            case GATYEWAY_SMS_SEND_AND_RECEIVE: {       
                let response = await SendReceiveResponse(req.body.data);
                console.log("___________response:::::" + response);
                if (response.resutl === "succed" ){
                    return res.status(200).send(response);
                } else {
                    return res.status(500).send(response);
                }            
            }

            case GATEWAY_SMS_RECEIVED:

                var gatewaysRef = firestore.collection('gateways')
                            .doc("urls").get()
                            .then( async (document) => {   
                    
                    let url_send = document.data().url_send;

                    console.log("url_send: " +url_send);

                    let gateway = req.body.data.gateway;                  
                    let channel = req.body.data.channel;
                    let pagenumber = req.body.data.pagenumber;
                    let card = req.body.data.card;
                    let url = req.body.data.url;

                    console.log("gateway: "+ gateway);
                    console.log("channel: "+ channel);
                    console.log("pagenumber: "+ pagenumber);

                    var option_received = `{
                        "method": "POST",
                        "uri": "https://us-central1-notims.cloudfunctions.net/backend/gateway/smsreceived",
                        "body": {
                        "data": {
                            "gateway": "${gateway}",            
                            "url" : "${url}",
                            "channel" : "${channel}",
                            "card" : "${card}",
                            "pagenumber" : "${pagenumber}",
                            "autorization":"YWRtaW46Tm90aW1hdGlvbjIwMjA="
                        }
                        },
                        "json" : true 
                    }`;       
                    
                    console.log("option_received: " + option_received);

                    let receive_json = JSON.parse(option_received);
                
                    await rp(receive_json)
                        .then( async (results_sent) => {
                            
                            console.log("results_sent: " + JSON.stringify(results_sent));

                            let sim_number = results_sent.sim_numbers[0].sim_number;
                            let remote_number = results_sent.sim_numbers[0].remote_number;

                            console.log("sim_number: " + sim_number);
                            console.log("remote_number: " + remote_number);

                            let response = {
                              number : {
                                  sim_number: sim_number,
                                  remote_number : remote_number
                              }
                            }

                            res.status(200).send(response);
                            return {};

                    }).catch((error) => {
        
                        console.log("error: " + error);

                        res.status(400).send({"error":error});
                        return error;
                
                    });

                    return {};

                });                  

            break; 

            case GATYEWAY_REBOOT: 

                var option_received = `{
                    "method": "POST",
                    "uri": "https://us-central1-notims.cloudfunctions.net/backend/gateway/smsreceived",
                    "body": {
                    "data": {
                        "gateway": "${gateway}",            
                        "url" : "${url}",
                        "channel" : "${channel}",
                        "card" : "${card}",
                        "pagenumber" : "${pagenumber}",
                        "autorization":"YWRtaW46Tm90aW1hdGlvbjIwMjA="
                    }
                    },
                    "json" : true 
                }`;       
                
                console.log("option_received: " + option_received);

                let receive_json = JSON.parse(option_received);
            
                await rp(receive_json)
                  .then( async (results_sent) => {
                      
                  });


            break;

            default: noti(req, res);
        } 
    };  

    exports.exist = functions
                    .runWith({ memory: '2GB', timeoutSeconds: 540 })
                    .https.onRequest( async (req, res) => { 
                        
        console.log("LLEGAAAA");
        
        StatusByCard(1, "B", res);

        
    });

    var StatusByCard = async function(gateway_number, card, res) {

      var cards_urls = await UsingAll();  
      
      var urls = cards_urls.urls;
      var cards = cards_urls.cards; 
      
      console.log("urls: " + urls);
      console.log("---------------------------------------------");
      console.log("cards: " + cards);
      console.log("---------------------------------------------");

      let gateway_name = "S" + gateway_number;      
      let channels = cards[gateway_name].channels; 

      var switch_to_card = await SwitchToCard(gateway_number, card, channels, urls);    

      console.log("----------------------2-----------------------");
      console.log("switch_to_card: " + JSON.stringify(switch_to_card));

      /*var promise_status = await StatusByGateway(gateway_number, urls, switch_channels);   
     
      Promise.all(rp(promise_status))
      .then( async (results_status) => {  
        
        console.log("results_switch: " + JSON.stringify(results_status));        
        console.log("");     

        //console.log("results_sends :::: " + JSON.stringify(results_sends));  
        res.status(200).send({status:completed});
        return true;          
      
      }).catch((error) => {
      
        console.log("error: " + error);
        res.status(200).send({"error" :error});       

      });*/

    };

    var UsingAll = async function () {

      var gatewaysRef = firestore.collection('gateways');      

      var urlObj  = {};     
      var cards   = [];

     await gatewaysRef.get().then( async (querySnapshot) => {     
          querySnapshot.forEach( async (doc) => {                      

            if (doc.id=="urls") {             
              
              //console.log("cards: " + JSON.stringify(cards));
              urlObj.url_domain      = doc.data().url_domain;   
              urlObj.url_using       = doc.data().url_using;   
              urlObj.url_base        = doc.data().url_base;   
              urlObj.url_management = doc.data().url_management;   
              urlObj.url_base        = doc.data().url_base;   
              urlObj.url_switch      = doc.data().url_switch;   
              urlObj.url_base_remote = doc.data().url_base_remote;  
              urlObj.url_base_local  = doc.data().url_base_local;  
              urlObj.parmas_using    = doc.data().parmas_using;               

            } else {

              let icard =  {
                gateway : doc.data().gateway,   
                number : doc.data().number,   
                position : doc.data().position,
                channels : doc.data().channels,
                id : doc.id
              };

              cards.push(icard);
            }

          });
      });

      var ps = [];
      var cardJson = `{`;
      var count = 0;    

      console.log("cards.length: " + cards.length);

      await cards.forEach( async (card) => {                   
          let uri_remote = urlObj.url_base_remote + urlObj.parmas_using;
          let url_gateway = urlObj.url_domain + urlObj.url_using;     
          
          let options = {
            method: 'POST',
            uri: uri_remote,
            body: {
              data: {
                gateway: card.number,            
                url : url_gateway,                    
                autorization:"YWRtaW46Tm90aW1hdGlvbjIwMjA="
              }
            },
            json: true 
          }; 
          ps.push(rp(options));

          let c = JSON.stringify(card);
          cardJson += `"${card.id}":${c}`;
          if (count === (cards.length-1)) {
            cardJson += `}`;  
            return cardJson;
          } else {
            cardJson += `,`;  
          }
          count++;
      });

      //console.log("cardJson: " + cardJson);

      var cardObj = JSON.parse(cardJson);      
      
      var promises_sims = [];
      var promises_gateway = [];

      var result = await Promise.all(ps)
        .then((results) => {      

            results.forEach( async (result) => {

              let response  = result.response;
              let gateway   = "S" + response.gateway;
              let channels  = response.channels;
              let ports     = response.ports;               
              
              response.sims.forEach( async (obj) => {                 
                var portName = "port" + obj.port;                                                                     
                var jsonCards = `{`;
                var countAdded=0;                
                obj.channel.forEach( async (channel) => {
                  
                  jsonCards += `"${channel.card}":{"status":"${channel.status}"}`;                                                                                                                             
                  if (countAdded === 3) {
                      jsonCards += `}`;                     
                      let jsonPorts = JSON.parse(jsonCards);
                      countAdded=0;
                      promises_sims.push(firestore.collection('gateways').doc(gateway)
                      .collection("sims").doc(portName).set(jsonPorts,{merge:true}));
                  } else {
                    jsonCards += `,`;
                    countAdded++;
                  }

                });
              });   

              promises_gateway.push(
                firestore.collection('gateways').doc(gateway)
                .set({channels : channels, ports: ports},{merge:true})
              );  
              
            });             

            return Promise.all(promises_gateway);  

          }).then((response_gateway) => {

            //console.log("response_gateway: " + JSON.stringify(response_gateway));
          
            return Promise.all(promises_sims); 
  
          }).then((response_sims) => {   
            
            //console.log("response_sims: " + JSON.stringify(response_sims));

            let res = {
              urls:urlObj,
              cards:cardObj
            };

            return res;

        }).catch((error) => {
      
          console.log("error: " + error);
          return error;           
  
        });

        return result;
        
    };

    var StatusByGateway = async function (gateway, urls, switch_channels) {         
      

      var promises_status = [];
       
       var option_status = {
          method: 'POST',
          uri: urls.url_base_remote + urls.params_status,
          body: {
            data: {
              gateway: gateway,            
              url : url,
              autorization:"YWRtaW46Tm90aW1hdGlvbjIwMjA="
            }
          },
          json: true 
        };          
  
        var resutl = await rp(option_status)
        .then(function (results_status) { 
          
          results_status.managment.forEach( async (obj) => {                
            
            let port  = obj.port;
            let portname = "port" + port;
            let operator  = obj.operator;
            let signal    = obj.signal;

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

            //send promise
            var recipient, message;
            
            switch (operator) {
              case "Personal":
                recipient = "264";             
                message   = "Linea"; 
                break;
              case "Movistar":
                recipient = "321";  
                message   = "Numero"; 
                break;
              case "Claro":
                recipient = "686";
                message   = "NUMERO"; 
                break;
            }         

            var uri = urls.url_base_remote + urls.params_send;
            let url = urls.url_domain + urls.url_send;            

            var channel = port-1;

            var gateway_name = "S" + gateway;

            var options_send = `{
              "method": "POST",
              "uri": "${uri}", 
              "timeout": "10000",
              "body": {
                "data" : {
                  "gateway" : "${gateway_name}",
                  "channel" : "${channel}",
                  "recipient" : "${recipient}",
                  "message" : "${message}",
                  "url": "${url}", 
                  "autorization" : "YWRtaW46Tm90aW1hdGlvbjIwMjA="
                 }
              },
              "json": true 
            }`;   
            
            let jsonStatus = `{"${card}": {
                "operator":"${operator}",
                "signal":"${signal}",
                "switch":"${switch_channels[gateway_name].post}",
                "send":"${options_send}",
              }
            }`;

            //let jsonStatus = JSON.parse(json);                                                                                           
      
            promises_status.push(firestore.collection('gateways').doc(gateway_name)
            .collection("sims").doc(portname).set(jsonStatus,{merge:true}));

          }); 

          return resutl;
      
        }).catch((error) => {

          console.log("error carajo: " + error);
          return error;          
  
        });     
        
        return promises_status;

    };


    var SwitchToCard = async function (gateway_number, card, channels, urls) {

      var cardstatus = card + ".status";
      var promise_switch = []; 
      var promise_store = []; 
      var count = 1;
      var gateway = "S" + gateway_number;

      console.log("---------------------2------------------------");


      var gatewaysRef = firestore.collectionGroup('sims')
      .where(cardstatus, "in", ["Exist", "Using"]);      

        await gatewaysRef.get().then( async (querySnapshot) => {     
          querySnapshot.forEach( async (doc) => {        

            let parent = doc.ref.parent.parent;         
            
            if ( parent.id === gateway ) {

                var gateway_number = parent.id.replace( /^\D+/g, '');
                var port_number = doc.id.replace( /^\D+/g, '');         

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
                
                var info = (parseInt(port_number) -1) + ":" + position;                        

                var options = {
                  method: 'POST',
                  uri: "http://s1.notimation.com/5-9-2SIMSwitch.php",
                  headers : {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic YWRtaW46Tm90aW1hdGlvbjIwMjA=',
                    'Cookie': 'PHPSESSID=3duuuba087srnotdfkda9d8to3'
                  },
                  form: {
                    action: 'SIMSwitch',
                    info: info 
                  }             
                };                         
                
                console.log(port_number + " options: " + JSON.stringify(options));
                

                promise_switch.push(options);                
                promise_store[port_number] = options;

                console.log("channels: " + channels);
                console.log("count: " + count);
                console.log("_____________");

                if (channels==count){

                  console.log("LA CONCHA DE TU MADRE");

                }

                count++;

            }     
          });     

          return {};
        });

        console.log("SALEEEEEEEEEEE");

        Promise.all(rp(promise_switch))          
        .then( async (response_switch) => {

          console.log("response_switch: " + response_switch);

          return promise_store;
          
        }).catch((error) => {

          console.log("error carajo: " + error);
          return error;          
  
        }); 

        //return promise_store;         
    };  


    


/*    var SwitchChannel = async function (gateway_number, card, channels, urls) {

      var channelstatus = card + ".status";    
      
      var gateway = "S" + gateway_number;

      var collected_switches = [];
      var gatway_switches = [];

      var switch_post = `{`;
      var resJson;

      var counter = 1;

      var gatewaysRef = firestore.collectionGroup('sims')
      .where(channelstatus, "in", ["Exist", "Using"]);      

        await gatewaysRef.get().then( async (querySnapshot) => {     
          querySnapshot.forEach( async (doc) => {                             

            let parent = doc.ref.parent.parent;           
            
            if ( parent.id === gateway ) {

                var gateway_number = parent.id.replace( /^\D+/g, '');
                var port_number = doc.id.replace( /^\D+/g, '');         

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

                var port = (parseInt(port_number) -1);                
                var info =  port + ":" + position;                
                let url = urls.url_base + gateway_number + urls.url_domain + urls.url_switch;

                var post = {
                  method : 'POST',
                  uri : url,
                  headers : {
                    'Content-Type' : 'application/x-www-form-urlencoded',
                    'Authorization' : 'Basic YWRtaW46Tm90aW1hdGlvbjIwMjA=',
                    'Cookie' : 'PHPSESSID=3duuuba087srnotdfkda9d8to3'
                  },
                  form : {
                    action : 'SIMSwitch',
                    info: info 
                  }             
                };    

                gatway_switches.push(post);
                collected_switches[port] = post;
                

                /*console.log("gateway.id: " + gateway.id);
                console.log("channel: " + channel);
                console.log("**********************************");
                console.log("");*/

                /*switch (num) {
                  case 0: a_promise_switch.push(rp(options)); break;
                  case 0: b_promise_switch.push(rp(options)); break;
                  case 0: c_promise_switch.push(rp(options)); break;
                  case 0: d_promise_switch.push(rp(options)); break;
                }*/  



                /*switch_post += ` "${port}" : {                    
                    "card" : "${card}",                     
                    "post": ${post}                  
                }`;*/

                

                //console.log("channel: " + channels + " counter: " +counter );

                /*if ( parseInt(channels) === counter) {
                  switch_post += `}`;   
                  resJson = switch_post;                
                } else {
                  switch_post += `,`;
                }
                counter++;

                

                //promise_switch.push(rp(options));
                //promise_switch.push(switch_post);

            }     
          });     
          
          return {};

        }).then((response_sims) => {    

          return collected_switches;
          
        }).catch((error) => {

          console.log("error carajo: " + error);
          return error;          
  
        });   

        return collected_switches;         
    };  */
    
    
    var SendReceiveResponse = async function(data) {

      //req.body.data.gateway;

      let gateway = data.gateway;
      let channel = data.channel;
      let recipient = data.recipient;
      let message = data.message;
      let url = data.url;
      let card = data.card;

      var options_send_and_receive = `{
        "method": "POST",
        "uri": "https://us-central1-notims.cloudfunctions.net/backend/gateway/send", 
        "timeout": "10000",
        "body": {
          "data" : {
            "gateway" : "${gateway}",
            "channel" : "${channel}",
            "recipient" : "${recipient}",
            "message" : "${message}",
            "url": "${url}", 
            "autorization" : "YWRtaW46Tm90aW1hdGlvbjIwMjA="
           }
        },
        "json": true 
      }`;       
      
      let sar_json = JSON.parse(options_send_and_receive);

      var current = new Date();

      await rp(sar_json)
      .then( async (response_sent) => {
        
        var resutl = response_sent.result;            
        let sent = resutl.sent;
        let sentlength = sent.length;
        let last = sent[sentlength-1];
        
        console.log("last.time: "+ last.time);
        
        const timereceived = new Date(last.day + " " + last.time);

        console.log("current: " + JSON.stringify(current));
        console.log("timereceived: " + JSON.stringify(timereceived));

        let cur = current.getTime();
        let rec = timereceived.getTime();      

        if ( (last.status === "Success") && 
             (last.number === "264") &&
             ( cur < rec ) ) {

          return {
            gateway : resutl.gateway,                 
            channel : resutl.channel,     
            card : card
          };

        } else {
          console.log("FAAAIIILLLLL");
          //res.status(500).send("fail");
          return {
            resutl: "fail",
            error: {
              status: last.status,
              number: last.number,
              current : cur,
              recieved : rec
            } 
          }
        }           

      }).then( async (response_send) => {       

        console.log("results_sends :::: " + JSON.stringify(response_send)); 
        
        let gateway = response_send.gateway;
        let channel = response_send.channel;
        let card = response_send.card;

        console.log("gateway: " +gateway);
        console.log("channel: " +channel);
        console.log("card: " +card);


        var option_received = `{
          "method": "POST",
          "uri": "https://us-central1-notims.cloudfunctions.net/backend/gateway/smsreceived",
          "body": {
            "data": {
              "gateway": "${gateway}",            
              "url" : ".notimation.com/en/5-3-1SMSinfo.php?ch=",
              "channel" : "${channel}",
              "card" : "${card}",
              "pagenumber" : "1",
              "autorization":"YWRtaW46Tm90aW1hdGlvbjIwMjA="
            }
          },
          "json" : true 
        }`;       

        let receive_json = JSON.parse(option_received);

        console.log("receive_json :::: " + JSON.stringify(receive_json)); 
        
        return rp(receive_json);                        

      }).then( async (response_receive) => {   
        
        console.log("results_sent: " + JSON.stringify(response_receive));

        let sim_number = response_receive.sim_numbers[0].sim_number;
        let remote_number = response_receive.sim_numbers[0].remote_number;

        console.log("sim_number: " + sim_number);
        console.log("remote_number: " + remote_number);

        let response = {
          resutl: "succed",
          number : {
            sim_number: sim_number,
            remote_number : remote_number
          }
        }

        //res.status(200).send(response);            

        return response;

      
      }).catch((error) => {
  
        console.log("error: " + error);        
        return {
          resutl: "fail",
          error: error
        }       

      });

    }

    
    var SendPromises = async function (promises) {        
      
      /*var posting = true;

      var length_promises =  promises.length;
      var countSent = 0;

      let responses = [];

      for (var i=0; i<length_promises; i++) {

        sleep(function() {   

          posting = true;

          let promise = promises[i];

          console.log("POST: " + i + " " + JSON.stringify(promise) );

          rp(promise)          
          .then( async (response) => {  

            console.log("STATUS RESPONSE: " + JSON.stringify(response));

            let status = response[length_promises-1].status;

            console.log("STATUS: " + status);

            responses.push(response);

            if (countSent == (length_promises-1)){ 
               return await SmsReceived();
            }
            posting = false;
            countSent++;

          })
          .catch(function (err) {
              // Crawling failed...
              posting = false;
              console.log("ERROR SendPromises:" + err);
          });

        });

      }  

      function sleep(callback) {
          var stop = new Date().getTime();
          //while(new Date().getTime() < stop + time) {
          while( posting === false ) {
              ;
          }
          callback();
      }*/

    };
    
   

    /*const status = async function(req, res, url) {  

      console.log(">>>>>>>>>>>>>>>>>>>> POST <<<<<<<<<<<<<<<<<<<<<<<<");
  
      var options = {
        method: 'POST',
        uri: url,
        body: {
          data: {
            gateway: req.body.data.gateway,            
            url : req.body.data.url,
            autorization:"YWRtaW46Tm90aW1hdGlvbjIwMjA="
          }
        },
        json: true 
      };    

      console.log(JSON.stringify(options));
 
      rp(options).then(function (body) {               
        return res.status(200).send({"response" :body});
      }).catch(function (err) {           
        return res.status(400).send({"error" :err});
      });    
       
    };*/
    

    const using = async function(req, res, url) {  

      console.log(">>>>>>>>>>>>>>>>>>>> POST <<<<<<<<<<<<<<<<<<<<<<<<");
  
      var options = {
        method: 'POST',
        uri: url,
        body: {
          data: {
            gateway: req.body.data.gateway,            
            url : req.body.data.url,
            autorization:"YWRtaW46Tm90aW1hdGlvbjIwMjA="
          }
        },
        json: true 
      };    

      console.log(JSON.stringify(options));
 
      rp(options).then(function (body) {               
        return res.status(200).send({"response" :body});
      }).catch(function (err) {           
        return res.status(400).send({"error" :err});
      });    
       
    };  
   
    const switchsim = async function(req, res, url) { 
      
      console.log("entra");
  
      var options = {
        method: 'POST',
        uri: url,
        body: {
          data: {
            all: req.body.data.all,
            applyto: req.body.data.applyto,
            gateway: req.body.data.gateway,
            switch_mode: req.body.data.switch_mode,
            url : url,
            autorization:"YWRtaW46Tm90aW1hdGlvbjIwMjA="
          }
        },
        json: true 
      };

      console.log("json: " + JSON.stringify(options));
 
      rp(options).then(function (body) {        
        
        return res.status(200).send({"response" :body});

      }).catch(function (err) {          
        return res.status(400).send({"error" :err});
      });    
       
    };  

    var ACTION_OBTAIN_TELCO = "action_obtain_telco";

    const simnumbers = async function(req, res) {
      
      var _gateway = req.body.data.gateway;
      
      var options = {
        method: 'POST',
        uri: 'https://us-central1-notims.cloudfunctions.net/backend/gateway/switch',
        body: {
          data: {
            all: false,
            applyto: 0,
            gateway:_gateway,
            switch_strategy: 5,
            url : ".notimation.com/en/5-9-1SIMSet.php?id=",
            autorization:"YWRtaW46Tm90aW1hdGlvbjIwMjA="
          }
        },
        json: true 
      };

      rp(options).then(function (body) {
       
         let ports = parseInt(body.ports);        
         var _time =  new Date();

         firestore.collection('gateways')
          .doc(`S${_gateway}`)       
          .update({ 
            ports : ports,
            action: ACTION_OBTAIN_TELCO,            
            last_update: _time 
          }).then(function(document) {                      
            
            return actions(req, res, ACTION_OBTAIN_TELCO);

          }).catch((error) => {
            console.log('Error updating collection:', error);
            res.status(400).send({"error" :err});
          });

          return body;

      }).catch(function (err) {          
        res.status(400).send({"error" :err});
      });    

    };


        /*const switchannel = async function(req, res, slot) {

      var options = {
        method: 'POST',
        uri: "http://s" + _gateway + ".notimation.com/5-9-2SIMSwitch.php",
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic YWRtaW46Tm90aW1hdGlvbjIwMjA=',
          'Cookie': 'PHPSESSID=3duuuba087srnotdfkda9d8to3'
        },
        form: {
          action: 'SIMSwitch',
          info: '1:0'
        }   

      };

      rp(options).then(function (body) {

        let ports = parseInt(body.response);        
        var _time =  new Date();
      
      }).catch(function (err) {          
        res.status(400).send({"error" :err});
      });    

    };*/