    
    const express = require('express');
    const functions = require('firebase-functions');
    const firebase = require('firebase');
    var admin = require('firebase-admin');
    const request = require('request');  
    var firestoreService = require('firestore-export-import');      
    var path = require('path');

    //var Blob = require('node-blob');
    //var blobUtil = require('blob-util');    
    //var createObjectURL = require('create-object-url');   
   
    
    var serviceAccount = require("./key/notims-firebase-adminsdk-rwhzg-9bd51fffc0.json");
    const { parse } = require('path');
    var db_url = "https://notims.firebaseio.com";

    var _payloadUrl = "http://noti.ms/";
    //_payloadUrl = db_url;    
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,        
    });

    firestoreService.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: db_url,        
    });
    
    const firestore = admin.firestore();    
    const storage = admin.storage();

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

    /**
     * WebApp Notification
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
     * Post SMS
     */

    exports.postSMS = functions.https.onRequest( async  (req, res) => {        

      const _phone = req.body.data.phone;
      const _name = req.body.data.name;
      const _code = req.body.data.code; 
      const _client_id = req.body.data.client_id;  
      const _message = req.body.data.message;
      const _contact = req.body.data.contact;   
      
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
    
    //app.get('/', (req, res) => {

    exports.buildHtml = functions.https.onRequest((req, res) => {

      console.log("req.path:", req.path); 
      const pathParams = req.path.split('/');

      /**
       * EXPORT
       */
      
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
          
      /**
       * IMPORT
       */    

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
          
            //console.log(collName);
            //console.log(JSON.stringify(collObj));
            //console.log(docName);
            //console.log(JSON.stringify(docObj)); 

            firestore.collection(collName).doc(docName).set(docObj).then((res) => {          
                return res.status(200).send(res);                
            }).catch((error) => {        
              return res.status(400).send(error);
            });

        } catch (e) {
          console.error(e);
          return e;
        }  
        
     
      } else {

      /**
       * SHOW CARD
       */
      
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
            //let mensaje = document.data().message;
            //let contact = document.data().contact;
            let preview_image = document.data().preview_image;          
            let title = "Mensaje para " + name;
            const htmlString = buildHTMLForPage(title, name, preview_image);
            
            return res.status(200).send(htmlString);
          
          } else {
            return res.status(404).send("Document do not exit");
          }        

        }).catch((error) => {    
            console.log("Error getting document:", error);
            return res.status(404).send(error);
        });

      }     

    });

    /*function downloadJson(filename, json) {      
      let file = JSON.stringify(json);      
      let blob = new Blob([file], {type: "application/json"});      
      //let url  = blobUtil.createObjectURL(blob);
      //let _url = URL.createObjectURL(blob);
      let _url = createObjectURL(blob);      
      //let _array = fileReader.readAsArrayBuffer(blob);      
      //fileReader.setNodeChunkedEncoding(true || false);
      //let url = fileReader.readAsDataURL(blob);
      let element = document.createElement('a');      
      element.setAttribute('href', url);      
      element.setAttribute('download', filename + ".json");  
      element.style.display = 'none';
      document.body.appendChild(element);  
      element.click();  
      document.body.removeChild(element);
    }*/

    function buildHTMLForPage (title, nombre, image) {
      //let _style = buildStyle();
      //let _body = buildBody(nombre, mensaje, contacto);
      const html = '<!DOCTYPE html><head>' +          
      '<meta property="og:title" content="' + nombre + '">' +                    
      '<meta property="og:image" content="' + image + '"/>' +
      '<title>' + title + '</title>';
      //'<link rel="icon" href="https://noti.ms/favicon.png">' +
      //'<style>' + _style  + '</style>' +
      //'</head><body>' + _body + '</body></html>';
      return html;
   }  




   