    
    const express = require('express');
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

    const app = express();
    exports.app = functions.https.onRequest(app);

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
        */

    /**
     * Post SMS
     */

    exports.postSMS = functions.https.onRequest( async  (req, res) => {        

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

    exports.tiggerUpdate = functions.firestore
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

    exports.buildHtml = functions.https.onRequest((req, res) => {

        console.log("req.path:", req.path); 
        const pathParams = req.path.split('/');

        
        // EXPORT   
        
        if (pathParams[1] === "export") {

            //http://localhost:5000/export/cobranzas
            //https://noti.ms/export/cobranzas

            let collection = pathParams[2];         
        
            try {

              firestoreService
              .backup(collection)
              .then(data => {  
                res.status(200).send(data);
                //downloadJson(collection, data);   
                return data;           
              }).catch((error) => {                
                console.log('Error getting sertvice backup');
                return error;
              });  
              
            } catch (e) {
                console.error(e);
                return e;
            }
            
        
        // IMPORT        

        } else if (pathParams[1] === "import") {

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
          
        } else if (pathParams[1] === "composer") {         

            
           // COMPOSER
           // PREVIEW
           // WEB           

            if (pathParams[2] === "preview") {

              return res.status(200).sendFile( path.join(__dirname + '/../public/html/preview_composer.html' ));

            } else if (pathParams[2] === "campaign") {

              return res.status(200).sendFile( path.join(__dirname + '/../public/html/campaign_composer.html' ));

            } else if (pathParams[2] === "web") {

              return res.status(200).sendFile( path.join(__dirname + '/../public/html/web_composer.html' ));

            } else {
            
              return res.status(200).sendFile( path.join(__dirname + '/../public/html/composer.html'));            

            }        
      
        } else {

        
         // SHOW CARD        
        
          const postId = pathParams[1];   
                
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

        }     

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

    });



    exports.gateways = functions.https.onRequest( async (req, res) => {

      var autorization = req.body.data.autorization; 
		
      var buff = Buffer.from(autorization, 'base64'); 
      let key = buff.toString('ascii');  
      var keys = key.split(":");     
      let user = keys[0];
      let pass = keys[1];
  
      console.log("user: " +user);
      console.log("pass: " + pass);	
  
      if ( (user === "admin") && (pass === "Notimation2020") ) {
  
        switch (req.url.split('/')[1]) {			
          case 'simnumbers': simnumbers(req, res); break;
          case 'send': send(req, res); break;
          case 'convert': convertHtmlToImage(req, res); break;
          default: getDefault(req, res);
        }	
  
      } else {
  
        res.status(401).send("Invalid authorization");  
      }

    });


    const send = async function(req, res) {  
      
      var _gateway = req.body.data.gateway;        

    };


    const switchannel = async function(req, res, slot) {

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


  const actions = async function(req, res, action) {

    switch (action) {

      case ACTION_OBTAIN_TELCO:
        console.log("show action");
         return switchByChannel("A");
        break;
      

    }

  };



  


  /*exports.processAction = functions.firestore
    .document('gateways/{number}')
    .onWrite((change, context) => {    

      const newValue = change.after.data();       
      let action = newValue.action;

      


      return action;
  }); */   



  /*

  for (var i=0; i<ports;i++) {
              
                var options = {
                    method: 'POST',
                    uri: 'http://s' + _gateway + '.notimation.com/5-9-2SIMSwitch.php',
                    headers : {
                      'Content-Type': 'application/x-www-form-urlencoded',
                      'Authorization': 'Basic YWRtaW46Tm90aW1hdGlvbjIwMjA=',
                      'Cookie': 'PHPSESSID=3duuuba087srnotdfkda9d8to3'
                    },
                    form: {
                      'action': 'SIMSwitch',
                      'info': i + ':0'
                    }
                };

                rp(options).then(function (body) {

                  if (i==(_gateway-1)) {

                  }

                }).catch(function (err) {          
                  res.status(400).send({"error" :err});
                });
              
           }

           */
   

  /*var options = {
    'method': 'POST',
    'url': 'http://s2.notimation.com/5-9-2SIMSwitch.php',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic YWRtaW46Tm90aW1hdGlvbjIwMjA=',
      'Cookie': 'PHPSESSID=3duuuba087srnotdfkda9d8to3'
    },
    form: {
      'action': 'SIMSwitch',
      'info': '1:0'
    }
  };

  request(options, function (error, response, body) {       

      if (!error) {

          var obj = eval('(' + body + ')');
          var json = JSON.stringify(obj); 
          
          console.log("body: " + JSON.stringify(json));
          
          res.send(json);                         
          
      } else { 

          var _error = JSON.parse(error);
          res.send(_error);
          return error;
      }

  });*/


  exports.parseTable = functions.https.onRequest( async (req, res) => {

    (async () => {     

      console.log("_______1_______");
  
      let browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      let page = await browser.newPage();     

      await page.authenticate({'username':'admin', 'password': 'Notimation2020'});      

      await page.goto('http://s2.notimation.com/en/10-6SMSManagement.php');            
      
      const crows = await page.$$('.wid1 > tbody > tr');
      var total = crows.length;

      console.log("total: " + total);

      var json = `{"ports":${total},"consumption":[`;

      await new Promise((resolve, reject) => {
        crows.forEach(async (row, i) => {  

          var td = (await row.$x('td'))[4];
          var text = await page.evaluate(td => td.textContent, td);  
          
          let spl = text.split("[");        
          let a = parseInt(spl[1].split("]")[0]);
          let b = parseInt(spl[2].split("]")[0]);
          let c = parseInt(spl[3].split("]")[0]);
          let d = parseInt(spl[4].split("]")[0]); 

          json += `{"port":"${i+1}","channel":{"A":${a},"B":${b},"C":${c},"D":${d}}}`;           

          console.log("text: " + text);
          console.log("a: " + a);
          console.log("b: " + b);
          console.log("c: " + c);
          console.log("d: " + d);    
          
          if (i==(crows.length-1)) { 
            json += "]}";
            console.log("json: " + json);
            resolve();
          } else {
            json += ",";
          }
        });       

      });


      console.log("-------------");

      res.status(200).send(json);

      /*
      await page.goto('http://s8.notimation.com/en/5-9SIM.php');       

      var c = 0;
      var r = 0;
      var k = 0;
      
      const rows = await page.$$('.wid1 > tbody > tr > td i');
      var total = rows.length;

      var json = `{"channels":${total/4},"ports":${total},"sims":[`;

      await new Promise((resolve, reject) => {
        rows.forEach(async (row, i) => {         
          
          var parent = (await row.$x('..'))[0];  
          var text = await page.evaluate(parent => parent.textContent, parent);                
          var t = text.replace(/\s+/g, '');
          
          switch (c) {
            case 0:
              k = r + 1;
              let aj = `{"port":"${k}","channel":[{"card":"A","status":"${t}"}`;
              json += aj;
            break;
            case 1:      
              let bj = `{"card":"B","status":"${t}"}`;
              json += bj;
            break;
            case 2:              
              let cj = `{"card":"C","status":"${t}"}`;
              json += cj;
            break;
            case 3:
              var dj = `{"card":"D","status":"${t}"}]}`;              
              if (i<(total-1)) {     
                dj += ",";
              }
              json += dj;
            break;
          }         

          if (c==3) {                        
            c=0;          
            r++;
            if (i==(rows.length-1)) { 
              let tj = "]}";
              json += tj;              
              resolve();         
            }         
          } else {                   
            let ej = "," ;
            json += ej;                
            c++;
          }             
        });
      });*/      

      res.status(200).send(json);

      await browser.close();

      return json;

    })();
      
  });




   