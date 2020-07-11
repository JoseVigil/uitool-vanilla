    
    const express = require('express');
    const functions = require('firebase-functions');
    const firebase = require('firebase');
    var admin = require('firebase-admin');
    //const chromium = require("chrome-aws-lambda");
    const puppeteer = require('puppeteer');
    //const puppeteer = require("puppeteer-core");
    //const nodeHtmlToImage = require('node-html-to-image');
    const request = require('request');    

    const htmlFunctions = require('./html_functions.js');

    const app = express();

    //var _payloadUrl = "http://noti.ms/";
    var _payloadUrl = "http://notimation-ms.firebaseapp.com/";

    /*app.all('*', async (req, res, next) => {
        // Note: --no-sandbox is required in this env.
        // Could also launch chrome and reuse the instance
        // using puppeteer.connect()
        res.locals.browser = await puppeteer.launch({          
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        next(); // pass control to next route.
    });*/

    var serviceAccount = require("./key/notimation-ms-firebase-adminsdk-jbv0c-5463f12f44.json");
    var db_url = "https://notimation-ms.firebaseio.com";
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,
        //credential: admin.credential.applicationDefault()
    });
    
    const db = admin.firestore();    
    const storage = admin.storage();

    const firebaseConfig = {
        apiKey: "AIzaSyBtxWKuwsGfMoDZ_0yDvC7w0SEbEno418U",
        authDomain: "notimation-ms.firebaseapp.com",
        databaseURL: "https://notimation-ms.firebaseio.com",
        projectId: "notimation-ms",
        storageBucket: "notimation-ms.appspot.com",
        messagingSenderId: "331232969906",
        appId: "1:331232969906:web:fee03f0058004ed84df5ab",
        measurementId: "G-QW5PLEMZTN"
    };
    firebase.initializeApp(firebaseConfig);
    firebase.functions().useFunctionsEmulator('http://localhost:5000');    
  
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
      })
      .then(function(docRef) {           
          
        postRequestSMS(req, docRef, function(result){
          res.send(JSON.stringify(result));
        });                 
        return docRef.id;

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

      request(options, function (error, response, body) {
          if (!error) {
              let _body = JSON.parse(body);                
              var _data = _body["data"];
              var smsid = _data["sms_id"];                         
              return docRef.update({
                sms_id: smsid
              }).then(function() {                
                  callback(smsid);
                  return smsid;
              }).catch(function(e) {                
                  callback(e);
              });                     
          } else {                
              var _error = JSON.parse(error); 
              callback(_error);   
              return _error;             
          }            
      });       
    } 

    /**
     * Convert Html To Image
     */

    exports.convertHtmlToImage = functions.firestore
      .document('cobranzas/{cobranzasId}')
      .onCreate( async (snap, context) => {
      //.onCreate( async (change, context) => {          
      
      //const newValue = change.after.data();       
      //let name = newValue.name;
      //let message = newValue.message;
      //let cobranzasId = context.params.cobranzasId;   
 
      //const newValue = change.after.data();       
      const newValue = snap.data();
      let name = newValue.name;
      let message = newValue.message;
      let sms_id = newValue.sms_id;
      let cobranzasId = context.params.cobranzasId;   

      //console.log('name:', name);
      //console.log('message:', message);
      //console.log('cobranzasId:', cobranzasId);    

      let _html = htmlFunctions.buildHTMLForImage(name, message).toString();

      //console.log('_html:', _html);

      /*let image64 = await nodeHtmlToImage({
        html: _html,    
        encoding: "base64",
        puppeteerArgs : ['--no-sandbox', '--disable-setuid-sandbox']
      }).catch((error) => {
        console.log('Error nodeHtmlToImage:', error);
        return error;
      });*/
    
      var screenshotBuffer = null;
      var browser = null;
      
      try {

        //https://www.ribice.ba/cloud-function-html-to-pdf/

        const browser = await puppeteer.launch({          
          headless: false,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        /*const browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless
        });*/

        /*browser = await chromium.puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });*/

        const page = await browser.newPage();      
        await page.setViewport({
                  width: 1200,
                  height: 630,
                  deviceScaleFactor: 1,
                });
        await page.setContent(_html);       
        screenshotBuffer = await page.screenshot({encoding: "binary"});
        await browser.close(); 

      } catch (e) {
        console.error(e);
        return e;
      }      

      const bucket = admin.storage().bucket("notimation-ms.appspot.com");
      const imageBuffer = new Uint8Array(screenshotBuffer);
      const file = bucket.file(`cobranzas/sipef/${sms_id}.png`, {
          uploadType: {resumable: false}
      });
      
      const config = {
        action: 'read',
        expires: '03-01-2500',
      }; 
  
      await file.save(imageBuffer, (err) => {
          if (err) {
              console.error(`Error uploading: ${filename} with message: ${err.message}`);
              return;
          }  
          console.log('Uploaded file');
      });      

      const imageUrl = await file.getSignedUrl(config);     

      console.log('imageUrl: ' + imageUrl);

      let _time = admin.firestore.FieldValue.serverTimestamp(); 

      await db.collection("cobranzas").doc(cobranzasId).update(            
        {preview_image: imageUrl.toString(), time_updated_image:_time}
      ).then((document) => {
        return document;
      }).catch((error) => {
        console.log('Error updating:', error);
        return error;
      });        

    }); 
   
    /**
     * Build Html For Noti
     */

    exports.buildHtmlForNoti = functions.https.onRequest((req, res) => {
      
      console.log("req.path:", req.path); 
      const path = req.path.split('/');
      const postId = path[1];        
      
      if (!postId) {
        return res.status(400).send('No se encontro el Id');
      }       

      db.collection('cobranzas').doc(postId).get().then(function (document) {
          
        if (document.exists) {

          let docId = document.id;
          let name = document.data().name;
          let mensaje = document.data().message;
          let contact = document.data().contact;
          let image = document.data().image;
          let title = "Mensaje para " + name;
          const htmlString = htmlFunctions.buildHTMLForPage(title, name, mensaje, contact, image);
          
          return res.status(200).end(htmlString);
        
        } else {
          return res.status(404);
        }        

      }).catch(function (error) {
          console.log("Error getting document:", error);
      });       
    
    });
     
    /**
     * Screenshot Test
     */

    /*app.get('/screenshot', async function screenshotHandler(req, res) {
        const url = req.query.url;
        if (!url) {
        return res.status(400).send(
            'Please provide a URL. Example: ?url=https://google.com');
        }
        const browser = res.locals.browser;

        try {
          const page = await browser.newPage();
          await page.goto(url, {waitUntil: 'networkidle2'});
          const buffer = await page.screenshot({fullPage: true});
          res.type('image/png').send(buffer);
        } catch (e) {
          res.status(500).send(e.toString());
        }
        await browser.close();
        return url;
    });   
    const opts = {memory: '2GB', timeoutSeconds: 60};    
    exports.screenshot = functions.runWith(opts).https.onRequest(app);*/
    
  
   