    
    
    const functions = require('firebase-functions');
    const firebase = require('firebase');
    var admin = require('firebase-admin');
    const request = require('request');  
    var firestoreService = require('firestore-export-import');      
    var path = require('path');       
    var pdfMake = require("pdfmake/build/pdfmake");
    var pdfFonts = require("pdfmake/build/vfs_fonts");
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
    var htmlToPdfmake = require("html-to-pdfmake");
    var rp = require('request-promise');    

    //const readXlsxFile = require('read-excel-file/node');

    /**
     * Remote gateway control
     */
    const puppeteer = require('puppeteer');

    //var Blob = require('node-blob');
    //var blobUtil = require('blob-util');    
    //var createObjectURL = require('create-object-url');   
    
    var serviceAccount = require("./key/notims-firebase-adminsdk-rwhzg-9bd51fffc0.json");
    const { parse } = require('path');

    var db_url = "https://notims.firebaseio.com";
    var _payloadUrl = "http://noti.ms/";    
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,        
    });    

    firestoreService.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: db_url,        
    });
    
    const firestore = admin.firestore();    
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

    const settings = {timestampsInSnapshots: true};          
    firestore.settings(settings);

    exports.processXml = functions.storage.object().onFinalize(async (object) => {  
    
      const filePath = object.name;
      const customMetadata = object.metadata;      

      if (customMetadata.type === "xls") {

        var _path = customMetadata.path;
        var _documentId = customMetadata.documentId;

        const bucket = admin.storage().bucket(object.bucket);

        const file = bucket.file(filePath);
        const contentType = object.contentType; // This is the image MIME type
        const fileDir = path.dirname(filePath);
        const fileName = path.basename(filePath);

        const xlsFilePath = path.normalize(path.join(fileDir, `${THUMB_PREFIX}${fileName}`));

        const _file = bucket.file(xlsFilePath);

        var rowNumber=0;

        /*readXlsxFile(_file).then(async (rows) => {                             
          
          if (rowNumber===0) { 
            
            let l = rows[0].length;
            var _row = rows[0];
            var columns = [];
            
            for (var i=0; i<l; i++) {
              let col = _row[i];
              columns.push(col);
            }

            let _time = admin.firestore.FieldValue.serverTimestamp();

            let campaignRef = firestore.collection(_path).doc(_documentId);

            await campaignRef.update({
              columns: columns,              
              updated_time:_time                  
            }).catch((error) => {
              console.log('Error updating document:', error);
              return error;
            });             

          }

          return rows; 


        }).catch((error) => {
          console.log('Error reading xml:', error);
          return error;
        });*/

      }

    });

    /**
     * WebApp Push Notification
     * https://www.freecodecamp.org/news/how-to-add-push-notifications-to-a-web-app-with-firebase-528a702e13e1/#:~:text=Notifications%20with%20Firebase,any%20device%20using%20HTTP%20requests.
     */

     /**
      * Backup and restore
      * https://levelup.gitconnected.com/firebase-import-json-to-firestore-ed6a4adc2b57
      */

    /**
     * Download Image 
     * https://firebase.google.com/docs/storage/web/download-files
     */      

    /**
     * Indexa tus datos
     * https://firebase.google.com/docs/database/security/indexing-data?hl=es
     */ 

     /**
      * Storage API AUDIT LOG
      * https://cloud.google.com/storage/docs/json_api/v1/buckets/get?authuser=6&apix_params=%7B%22bucket%22%3A%22notims.appspot.com%22%2C%22projection%22%3A%22full%22%2C%22userProject%22%3A%22notims%22%2C%22alt%22%3A%22json%22%2C%22fields%22%3A%22sipef%22%2C%22prettyPrint%22%3Atrue%7D      
      *
      * LOGGING LIBRARY
      * https://cloud.google.com/logging/docs/reference/libraries#client-libraries-install-nodejs
      * 
      * CONFIGURAR LOGGIN PARA API
      * https://cloud.google.com/logging/docs/setup/nodejs?hl=es-419
      */

      /**
       * Logging 
       * https://www.npmjs.com/package/@google-cloud/logging-winston#samples
       */

      /** 
      * Log Node
      * https://cloud.google.com/functions/docs/monitoring/logging#viewing_logs 
      * /

       /**
        * HTML OPEN GRAPH
        * https://gist.github.com/alnguyenngoc/7635341
        */

      /**
       * 
       * EDITOR
       * https://www.tiny.cloud/
       * 
       * CUSTOM FORM
       * https://www.martyfriedel.com/blog/tinymce-5-creating-a-plugin-with-a-dialog-and-custom-icons
       * https://tinymce.martyfriedel.com/
       * 
       */

        /**
        * HTML TO PDF
        * https://www.npmjs.com/package/html-to-pdfmake
        * 
        */

        /**
         * RESPONSE ERRRORS API
         * https://developer.amazon.com/docs/amazon-drive/ad-restful-api-response-codes.html
         */

    /**
     * Post SMS
     */

    exports.postSMS = functions.https.onRequest( async (req, res) => {        

      const _phone = req.body.data.phone;
      const _name = req.body.data.name;
      const _code = req.body.data.code; 
      const _client_id = req.body.data.client_id;  
      const _message = req.body.data.message;
      const _contact = req.body.data.contact;
      const _invoices = req.body.data.invoices;   
      
      let _time = admin.firestore.FieldValue.serverTimestamp(); 

      var docId = makeid(6);
      var isExisted = true;   

      let docRefExist = await firestore.collection("cobranzas").doc(docId).get();        
      let exist = docRefExist.exist;        
      if (exist) {
          docId = makeid(6);
      }           

      console.log("docId: " + docId);

      let docRef = firestore.collection("cobranzas").doc(docId);
      
      return docRef.set({
        phone: _phone,
        name: _name,
        code: _code,
        client_id:_client_id,
        message: _message,
        contact: _contact,
        time_created: _time  
      }).then(docRefSet => {      
          
        postRequestSMS(req, docRef, docId, (result) => {
          res.send(JSON.stringify(result));         
        });       
        return docRefSet;
        
      }).catch((error) => {     
        console.error("Error adding document: ", error);           
      });   

    });

    function makeid(length) {
      var result           = '';
      var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var charactersLength = characters.length;
      for ( var i = 0; i < length; i++ ) {
         result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
   }

    function postRequestSMS(req, docRef, docId, callback) {

      const _phone = req.body.data.phone;     
      const _payload = _payloadUrl + docId;

      var headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',     
          'Authorization': 'Bearer 7FA7ED241142E7BE36671CE0FEC9E84F'       
      };

      var dataString = '{"recipient":' + _phone + ',"message":"' + _payload + '","service_id":"5"}';        

      var options = {
          url: 'https://api.notimation.com/api/v1/sms',
          method: 'POST',
          headers: headers,
          body: dataString
      };  

      request(options, (error, response, body) => {
          
            if (!error) {
              
              let _body = JSON.parse(body);                
              let _data = _body["data"];
              let smsid = _data["sms_id"];                         
              
              return docRef.update({
                sms_id: smsid,
                update: true                
              }).then(() => {          
                  callback(smsid);
                  return smsid;
              }).catch((e) => {          
                  callback(e);
              });   

          } else {                
              var _error = JSON.parse(error); 
              callback(_error);   
              return _error;             
          } 
          

      }); 
    }          

    exports.triggerUpdate = functions.firestore
      .document('cobranzas/{cobranzasId}')
      .onUpdate( async (change, context) => {    

      const newValue = change.after.data();       
      let update = newValue.update; 
      
      console.log("update: " + update);
      
      if (update) {

        let name = newValue.name;        
        let message = newValue.message;
        let sms_id = newValue.sms_id;      
        let cobranzasId = context.params.cobranzasId;      
       
        var headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',            
        };

        var dataString = `{
          "data" : {
           "name" : "${name}",
           "message":"${message}",
           "sms_id" : "${sms_id}",
           "cobranzasId" : "${cobranzasId}"         
          }
         }`;

        var options = {
            url: 'https://us-central1-notims.cloudfunctions.net/htmlToImage',
            method: 'POST',
            headers: headers,
            body: dataString
        };  
  
        request(options, function (error, response, body) {
  
            if (!error) {
  
                let _body = JSON.parse(body);
                console.log("body: " + JSON.stringify(_body));              
                
                let data = _body["data"];                
                console.log("data: " + JSON.stringify(data));                                             
                
                let image_path = data.image_path;               

                let userRef = firestore.collection("cobranzas").doc(cobranzasId);

                let _time = admin.firestore.FieldValue.serverTimestamp(); 

                var html = htmlToPdfMake(`<div>the html code</div>`, {window:window});

                var docDefinition = {
                  content: [
                    html
                  ]
                };

                var pdfDocGenerator = pdfMake.createPdf(docDefinition);
                pdfDocGenerator.getBuffer(function(buffer) {
                  fs.writeFileSync('example.pdf', buffer);
                });
                                
                return userRef.update({
                  image_path: image_path,
                  update: false,
                  image_updated:_time                  
                })
                .then(function() {
                    res.send(body); 
                    return body;
                }).catch((error) => {
                  console.log('Error updating document:', error);
                  res.send(e);
                  return error;
                });                         
                
            } else {
  
                var _error = JSON.parse(error);
                res.send(_error);
                return error;
            }

        });
      }    

    }); 


    exports.test = functions.https.onRequest( async (req, res) => {      

      return null;
    
    });
    
    //exports.scheduledFunction = functions.pubsub.schedule('* * * * * sleep 30').onRun((context) => {
      
    exports.schedule = functions.https.onRequest( async (req, res) => {             

      var gatewaysRef = firestore.collection('gateways');

      /*var url_sims, url_base, url_consumption, 
      url_base, url_send, url_switch, url_domain,
      url_base_remote, url_base_local, parmas_using;*/

      var _autorization = "YWRtaW46Tm90aW1hdGlvbjIwMjA=";

      var obj = {};   

      gatewaysRef.get().then( async (querySnapshot) => {     
          querySnapshot.forEach( async (doc) => {           
            
            if (doc.id==="S2") {              
              obj.gateway = doc.data().gateway;   
              obj.number = doc.data().number;   
              obj.position = doc.data().position;  
              obj.id = doc.id;  
            }

            if (doc.id==="urls") {

              obj.url_domain      = doc.data().url_domain;   
              obj.url_using        = doc.data().url_using;   
              obj.url_base        = doc.data().url_base;   
              obj.url_consumption = doc.data().url_consumption;   
              obj.url_base        = doc.data().url_base;   
              obj.url_switch      = doc.data().url_switch;   
              obj.url_base_remote = doc.data().url_base_remote;  
              obj.url_base_local  = doc.data().url_base_local;  
              obj.parmas_using    = doc.data().parmas_using;                            
          
              console.log("");
              console.log("");
              console.log("     !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
              console.log("     !!!!!!!!!! GATEWAY " + obj.gateway + " !!!!!!!!!!");
              console.log("     !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
              console.log("");
              
              var uri_remote = obj.url_base_remote + obj.parmas_using;
              var url_gateway = obj.url_domain + obj.url_using;              

              var options = {
                method: 'POST',
                uri: uri_remote,
                body: {
                  data: {
                    gateway: obj.number,            
                    url : url_gateway,                    
                    autorization:"YWRtaW46Tm90aW1hdGlvbjIwMjA="
                  }
                },
                json: true 
              };               
          
              rp(options).then( async function (body) {                  

                    try {

                      console.log("");
                      console.log("     !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!      ");
                      console.log("     !!!!!!!!! Channels " + body.response.channels + " !!!!!!!!!!");
                      console.log("     !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!      ");
                      console.log("");                         
                     

                      var channels = body.response.channels; 
                      var ports = body.response.ports;                    

                      var portRef = firestore.collection('gateways').doc(obj.gateway);

                      return portRef.set({ 
                        channels : channels,
                        ports: ports,
                      },{merge:true}).then( async () => {                      
                          
                          var simsJeys = Object.keys(body.response.sims);
                          var simsLength = simsJeys.length;                     
    
                          var countPots = 0;    
                          await body.response.sims.forEach( async (obj) => {                               

                            var portName = "port" + obj.port;                                                     

                            console.log("     !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!      ");
                            if (parseInt(obj.port)>9) {
                              console.log("     !!!!!!!!!!!  PORT " + obj.port + " !!!!!!!!!!!");
                            } else {
                              console.log("     !!!!!!!!!!!  PORT " + obj.port + " !!!!!!!!!!!!");
                            }
                            
                            console.log("     !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!      ");                         

                            var jsonCards = `{`;
                            var countAdded=0;
                            
                            await obj.channel.forEach( async (channel) => {                                                                      
                         
                              console.log("     !!!!!!!!!!!  PORT " + obj.port + " !!!!!!!!!!!");                           

                              jsonCards += `"${channel.card}":{"status":"${channel.status}"}`;                                                                                                             

                              if (countAdded === 3) {

                                  jsonCards += `}`;

                                  console.log("jsonCards: " +jsonCards);
                                  
                                  let jsonPorts = JSON.parse(jsonCards);
                                  countAdded=0;

                                  var simsRef = await portRef.collection("sims").doc(portName);

                                 return simsRef.set(jsonPorts,{merge:true})
                                  .then( async (pdoc) => {                                                                                                  
                                    
                                      if (countPots === (simsLength-1)) {                                      
                                        res.status(200).send({"result" : true});
                                      }  
                                      countPots++;                                                        
                                    
                                  }).catch((error) => {
                                    console.log('Error updating collection:', error);
                                    res.status(400).send({"error" :err});
                                  });   


                              } else {

                                jsonCards += `,`;
                                countAdded++;

                              } 

                                                                                 
                                
                            });
                          });                        
                      
                      }).catch((error) => {
                        console.log('Error updating collection:', error);
                        res.status(400).send({"error" :err});
                      });    
                      

                  } catch (e) {
                    console.error(e);
                    return res.status(400).send(e);                
                  }

              }).catch(function (err) {     
                console.log('------ERROORRR----------');      
                return res.status(400).send({"error" :err});
              });               

            }            
            

          });

          return querySnapshot;

      }).catch(err => {
          console.log('Error getting documents', err);
      });

      return gatewaysRef;

    });

    var OPTION_ACTION           = 'action';
    var OPTION_GATEWAY          = 'gateway';
    var OPTION_COMPOSER         = 'composer';
    
    var OPTION_EXPORT           = 'export';
    var OPTION_IMPORT           = 'import';

    var OPTION_COMPSUMPTION     = 'consumption';
    var OPTION_STATUS           = 'status';
    var OPTION_SEND             = 'send';
    var OPTION_SIMS_RECEIVED    = 'simsreceived';
    var OPTION_REBOOT           = 'reboot';
  
    exports.server = functions.https.onRequest((req, res) => {        
        
        console.log("<<<<<<<<<<<<<<<<<<<<======================");

        console.log("req.path:", req.path); 
        var autorization = req.body.data.autorization;
        
        //var _url = req.body.data.url;        
        //console.log("ENTRA BACKEND");         
        //console.log("req.body.data.autorization:" + autorization);         
        //console.log("req.body.data.url:" + _url);         
    
        var buff = Buffer.from(autorization, 'base64'); 
        let key = buff.toString('ascii');

        var keys = key.split(":"); 
      
        let user = keys[0];
        let pass = keys[1];

        console.log("user: " +user);
        console.log("pass: " + pass); 

        if ( (user === "admin") && (pass === "Notimation2020") ) {

          console.log("req.path.split('/')[1]:" +req.path.split('/')[1]);

          switch (req.path.split('/')[1]) {                        
            case OPTION_GATEWAY: gateway(req, res); break;
            case OPTION_COMPOSER: composer(req, res); break;
            case OPTION_ACTION: action(req, res); break;
            default: noti(req, res);
          } 

        } else {

          res.status(401).send("Invalid authorization");  

        }         

    });

    var OPTION_GET_SIM_NUMBERS  = 'simnumber';

    var OPTION_USING            = 'using';
    var OPTION_SWITCH           = 'switch';

    /*var OPTION_SWITCH_SIM       = 'switchsim';    
    var OPTION_COMPSUMPTION     = 'consumption';
    var OPTION_STATUS           = 'status';
    var OPTION_SEND             = 'send';
    var OPTION_SIMS_RECEIVED    = 'simsreceived';
    var OPTION_REBOOT           = 'reboot';*/
  
    var gateway = async function(req, res) {
      
      console.log("gateway: " + req.path.split('/')[2]);
      console.log("url_remote: " + req.body.data.url_remote);     
      
      switch (req.path.split('/')[2]) {      

        case OPTION_USING: {           
          let uurl = req.body.data.url_remote; //'https://us-central1-notims.cloudfunctions.net/backend/gateway/using';          
          return using(req, res, uurl);          
        }
        
        case OPTION_SWITCH: switchsim(req, res); break;
        case OPTION_COMPSUMPTION: consumption(req, res); break;
        default: noti(req, res);
      } 

    };

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


    const composer = async function(req, res) {  
      
      var _gateway = req.body.data.gateway;   
      
      if (pathParams[2] === "campaign") {

        return res.status(200).sendFile( path.join(__dirname + '/../public/html/campaign_composer.html' ));

      } else if (pathParams[2] === "web") {

        return res.status(200).sendFile( path.join(__dirname + '/../public/html/web_composer.html' ));

      } else {
      
        return res.status(200).sendFile( path.join(__dirname + '/../public/html/composer.html'));            

      }    

    };

    
    const send = async function(req, res) {  
      
      var _gateway = req.body.data.gateway;        

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

    
    
  // NOTI

  const noti = async function(req, res) {

    // SHOW CARD          
    
    const postId = req.path.split('/')[1];
             
    if (!postId) {
      return res.status(400).send('No se encontro el Id');
    }             

    return firestore.collection("cobranzas").doc(postId)
                    .get()
                    .then( (document) => {        
        
      if (document.exists) {

        let docId = document.id;
        let name = document.data().name;          
      
        let preview_image = document.data().preview_image;          
        let title = "Mensaje para " + name;
        const htmlString = buildHTMLForPage(docId, title, name, preview_image);

        console.log("_________________________");
        console.log(htmlString);
        
        return res.status(200).send(htmlString);
      
      } else {
        return res.status(403).send("Document do not exit");
      }        

    }).catch((error) => {    
        console.log("Error getting document:", error);
        return res.status(404).send(error);
    });

    function buildHTMLForPage (docId, title, nombre, image) {      
     var _html = '<!DOCTYPE html><head>' +          
     '<meta property="og:title" content="' + nombre + '">' +                    
     '<meta property="og:image" content="' + image + '"/>' +
     '<title>' + title + '</title>';                
     let _javascript = `<!DOCTYPE html><head><meta property="og:title" content="Jose Vigil"><meta property="og:image" content="https://storage.googleapis.com/notims.appspot.com/cobranzas/sipef/43YjVa_5205172.png?GoogleAccessId=notims%40appspot.gserviceaccount.com&Expires=16730323200&Signature=jbrD3iGC%2FbVaHDcfyUS2ipgfmpc2Czdi6ePG8HdcFmcMZ%2F3WaIpHUN%2BSWXU9tMOJfOm6aSJDfJPrQpXb5B9gzTzzrITXYRRElbLF1bJGtIzGbh48G9018DepMHWgEFzY6hTrGjFGuK9GPFBBu0FruHHYJgxRcEhnBGosJshOUCsddvVR%2Bh8eVvLJlMgMMaAV%2F2Aam0Z9MnUIFUDACX19NFqCEReiy1gFiWTLM15iyvoegQNgCwzX67dAKQfyfI3MeCQDvEDYKiP6Nbpgz%2F0oZOxl7XbvUQxToUc41R2sw%2FtFf8w3qh3uXUa%2FNijO5h7iiWunw98Y0FU%2Bjb5rw%2FRN6Q%3D%3D"/><title>Mensaje para Jose Vigil</title><script src="https://code.jquery.com/jquery-3.5.1.min.js"></script><script src="https://www.gstatic.com/firebasejs/7.2.1/firebase-app.js"></script><script src="https://www.gstatic.com/firebasejs/7.2.1/firebase-firestore.js"></script><script src="https://www.gstatic.com/firebasejs/7.2.1/firebase-functions.js"></script><script>$(document).ready(function(){console.log("ENTRAAAAAA");const e={apiKey:"AIzaSyAM4WQDHpHh1oRT_v-6ikquE4V809hA3kY",authDomain:"notims.firebaseapp.com",databaseURL:"https://notims.firebaseio.com",projectId:"notims",storageBucket:"notims.appspot.com",messagingSenderId:"79471870593",appId:"1:79471870593:web:ef29a72e1b1866b2bb4380",measurementId:"G-8T5N81L78J"};return firebase.initializeApp(e),firebase.firestore().collection("cobranzas").doc(` + docId + `).get().then(e=>{if(console.log("____1____"),e.exists){var o=0;if(console.log("____2____"),e.data().previewed){o=parseInt(e.data().previewed)+1}else o++;e.ref.update({previewed:o}).then(e=>(console.log("____3____"),e.id)).catch(e=>{console.log("Error saving preview "+e)})}return e.id}).then(e=>(console.log("____4____"),e.id)).catch(e=>(console.log("Error getting document:",e),res.status(404).send(e)))});</script></head>`;
     var _script;                
     _script =  `<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>`;
     _script += `<script src="https://www.gstatic.com/firebasejs/7.2.1/firebase-app.js"></script>`;
     _script += `<script src="https://www.gstatic.com/firebasejs/7.2.1/firebase-firestore.js"></script>`;        
     _script += `<script src="https://www.gstatic.com/firebasejs/7.2.1/firebase-functions.js"></script>`;  
     _script += `<script>${_javascript}</script>`;
     _html = _html + _script + '</head>';        
     return _html;
   } 
    
  };     



  const action = async function(req, res) { 

    let option = req.path.split('/')[2]; 
    var collection = req.body.data.collection; 
    
    console.log("option: " +option);

    switch (option) {

      case OPTION_EXPORT:          
         
          //http://localhost:5000/export/cobranzas
          //https://noti.ms/export/cobranzas                 

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

        case OPTION_IMPORT: 
          
            //http://localhost:5000/import/cobranzas
            //https://noti.ms/import/cobranzas

            try {

              let _collection = pathParams[2];   
              let _json_file = _collection + ".json";            
              let data = require("./imports/"  + _json_file );                    

              var collName, docName;                               
              var collObj, docObj;
              var level = 0;

              const iterate = (obj, level) => {
                Object.keys(obj).forEach(key => {        
                  //console.log('key: '+ key + ', value: '+ obj[key]);
                  if (level===0) {              
                    collName = key;
                    collObj = obj[key];
                  } else if (level===1) { 
                    docName = key;
                    docObj = obj[key];
                  }                      
                  if (typeof obj[key] === 'object') {
                    level++;
                    iterate(obj[key], level);
                  }
                });
              }

              iterate(data, 0);              

              firestore.collection(collName).doc(docName).set(docObj).then((res) => {          
                return res.status(200).send(res);                
              }).catch((error) => {        
                return res.status(400).send(error);
              });

          } catch (e) {
            console.error(e);
            return e;
          }  

        break;
        

      default:  
        res.status(402).send("Option not found");
      break;
    }   
    
  };






   