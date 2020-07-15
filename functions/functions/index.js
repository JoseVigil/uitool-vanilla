    
    const express = require('express');
    const functions = require('firebase-functions');
    const firebase = require('firebase');
    var admin = require('firebase-admin');
    const request = require('request');    

    //var _payloadUrl = "http://noti.ms/";
    var _payloadUrl = "http://notimation-ms.firebaseapp.com/";   

    var serviceAccount = require("./key/notims-firebase-adminsdk-rwhzg-9bd51fffc0.json");
    var db_url = "https://notims.firebaseio.com";

    //var _payloadUrl = "http://noti.ms/";
    _payloadUrl = db_url;    
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,        
    });
    
    const db = admin.firestore();    
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

    const app = express();
  
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
      
      db.collection("cobranzas").add({
        phone: _phone,
        name: _name,
        code: _code,
        client_id:_client_id,
        message: _message,
        contact: _contact,
        time_created: _time  
      }).then(docRef => {      
          
        postRequestSMS(req, docRef, (result) => {
          res.send(JSON.stringify(result));
        });                 
        return docRef;

      }).catch((error) => {     
        console.error("Error adding document: ", error);           
      });   

    });

    function postRequestSMS(req, docRef, callback) {

      let _id = docRef.id; 
      const _phone = req.body.data.phone;        
      const _payload = _payloadUrl + _id;       

      var headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',     
          'Authorization': 'Bearer 7FA7ED241142E7BE36671CE0FEC9E84F'       
      };

      var dataString = '{"recipient":' + _phone + ',"message":"' + _payload + '","service_id":"5"}';  
      console.log(dataString);

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
                update:true
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

                let userRef = db.collection("cobranzas").doc(cobranzasId);

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


     /**
     * Build Html For Noti
     */

    exports.buildNoti = functions.https.onRequest((req, res) => {
      
      console.log("req.path:", req.path); 
      const path = req.path.split('/');
      const postId = path[1];        
      
      if (!postId) {
        return res.status(400).send('No se encontro el Id');
      }       

      return db.collection('cobranzas').doc(postId).get().then( (document) => {
          
        if (document.exists) {

          let docId = document.id;
          let name = document.data().name;
          let mensaje = document.data().message;
          let contact = document.data().contact;
          let image = document.data().image;          
          let title = "Mensaje para " + name;
          const htmlString = htmlFunctions.buildHTMLForPage(title, name, mensaje, contact, image);
          
          return res.status(200).send(htmlString);
        
        } else {
          return res.status(404);
        }        

      }).catch((error) => {    
          console.log("Error getting document:", error);
      });       
    
    });

    function buildHTMLForPage (title, nombre, mensaje, contacto, image) {
        let _style = buildStyle();
        let _body = buildBody(nombre, mensaje, contacto);
        const string = '<!DOCTYPE html><head>' +          
        '<meta property="og:title" content="' + nombre + '">' +                    
        '<meta property="og:image" content="data:image/jpeg;base64,' + image + '"/>' +
        '<title>' + title + '</title>' +
        //'<link rel="icon" href="https://noti.ms/favicon.png">' +
        '<style>' + _style  + '</style>' +
        '</head><body>' + _body + '</body></html>';
        return string;
    }   

  
  
   