    
    const express = require('express');
    const functions = require('firebase-functions');
    const firebase = require('firebase');
    var admin = require('firebase-admin');
    const puppeteer = require('puppeteer');
    const nodeHtmlToImage = require('node-html-to-image');
    const request = require('request');    

    const htmlFunctions = require('./html_functions.js');

    const app = express();

    var _payloadUrl = "http://noti.ms/";

    // Runs before every route. Launches headless Chrome.
    app.all('*', async (req, res, next) => {
        // Note: --no-sandbox is required in this env.
        // Could also launch chrome and reuse the instance
        // using puppeteer.connect()
        res.locals.browser = await puppeteer.launch({
          args: ['--no-sandbox']
        });
        next(); // pass control to next route.
    });
    

    var serviceAccount = require("./key/notimation-ms-firebase-adminsdk-jbv0c-5463f12f44.json");
    var db_url = "https://notimation-ms.firebaseio.com";
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,
        //credential: admin.credential.applicationDefault()
    });
    
    const db = admin.firestore();
    //const storage = admin.storage();

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
    
    // // Create and Deploy Your First Cloud Functions
    // // https://firebase.google.com/docs/functions/write-firebase-functions

    exports.helloWorld = functions.https.onRequest((request, response) => {        
      response.send("Hello from Firebaseeeee!");
    }); 


    exports.saveSMS = functions.https.onRequest( async  (req, res) => {        

      const _phone = req.body.data.phone;
      const _name = req.body.data.name;
      const _code = req.body.data.code; 
      const _client_id = req.body.data.client_id;  
      const _message = req.body.data.message;
      const _contact = req.body.data.contact;              
      
      db.collection("cobranzas").add({
        phone: _phone,
        name: _name,
        code: _code,
        client_id:_client_id,
        message: _message,
        contact: _contact        
      })
      .then(function(docRef) {           
          
        /*postSMS(req, docRef, function(result){          

          res.send(JSON.stringify(result)); 

        });*/         
        
        res.send(docRef.id); 

      })        
      .catch(function(error) {
          console.error("Error adding document: ", error);
      });   

      //res.status(200).send(hola);
      
    });

    function postSMS(req, docRef, callback) {

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
              })
              .then(function() {
                  callback(smsid);
              })
              .catch(function(e) {                
                  callback(e);
              });                     
          } else {                
              var _error = JSON.parse(error); 
              callback(_error);                
          }            
      });       
    } 

    exports.convertHtmlToImage = functions.firestore
      .document('cobranzas/{cobranzasId}')
      .onWrite( async (change, context) => {    

      const newValue = change.after.data();       
      let name = newValue.name;
      let message = newValue.message;
      let cobranzasId = context.params.cobranzasId;   

      let image64 = await nodeHtmlToImage({
        html: htmlFunctions.buildHTMLForImage(name, message),
        //content: [{ name : name, message : message }],
        encoding: "base64" 
      }); 
      
      await db.collection("cobranzas").doc(cobranzasId).update(
        {image: image64}
      );

    }); 


    exports.buildHtmlForNoti = functions.https.onRequest((req, res) => {
      
      console.log("req.path:", req.path); 

      const path = req.path.split('/');
      const postId = path[1];        
      
      if (!postId) {
        return res.status(400).send('No se encontro el Id');
      } 

      console.log("postId:", postId);

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
        }

      }).catch(function (error) {
          console.log("Error getting document:", error);
      });       
    
    });
     
  
    app.get('/screenshot', async function screenshotHandler(req, res) {
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
    });
    // Handler that prints the version of headless Chrome being used.
    app.get('/version', async function versionHandler(req, res) {
        const browser = res.locals.browser;
        res.status(200).send(await browser.version());
        await browser.close();
    });
    const opts = {memory: '2GB', timeoutSeconds: 60};
    
    exports.screenshot = functions.runWith(opts).https.onRequest(app);
    exports.version = functions.https.onRequest(app);
    
    exports.buildHtmlWithContent = functions.https.onRequest((req, res) => {
        
        const path = req.path.split('/');
        const postId = path[2];                

        console.log("postId:", postId);

        db.collection('posts').doc(postId).get().then(function (document) {
            
            if (document.exists) {
                let docId = document.id;
                let title = document.data().title;
                const htmlString = buildHtml(post);
                res.status(200).end(htmlString);
            }

        }).catch(function (error) {
            console.log("Error getting document:", error);
        });

       /* admin.database().ref('/posts').child(postId).once('value').then(snapshot => {
          const post = snapshot.val();
          post.id = snapshot.key;
          const htmlString = buildHtmlWithPost(post);
          res.status(200).end(htmlString);
        });*/
    
    });

    function buildHtml (title, id) {
        const string = '<!DOCTYPE html><head>' +
          '<title>' + title + ' | Example Website</title>' +
          '<meta property="og:title" content="' + title + '">' +
          '<meta property="twitter:title" content="' + title + '">' +
          '<link rel="icon" href="https://example.com/favicon.png">' +
          '</head><body>' +
          '<script>window.location="https://example.com/?post=' + id + '";</script>' +
          '</body></html>';
        return string;
      }


      app.get("/render", async function(req, res) {
        console.log("entra render:");
        const image = await nodeHtmlToImage({
          html: '<html><body><div>Check out what I just did! #cool</div></body></html>'
        });
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(image, 'binary');
      });
      exports.render = functions.https.onRequest(app);