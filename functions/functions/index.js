    
    const express = require('express');
    const functions = require('firebase-functions');
    const firebase = require('firebase');
    var admin = require('firebase-admin');
    const puppeteer = require('puppeteer');
    const request = require('request');

    const app = express();

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
    //

    exports.helloWorld = functions.https.onRequest((request, response) => {
        
        response.send("Hello from Firebaseeeee!");    

    });


    /*const PUPPETEER_OPTIONS = {
        headless: false,
        args: [
          '--start-maximized',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--timeout=30000',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
          "--proxy-server='direct://'",
          '--proxy-bypass-list=*',
          '--deterministic-fetch',
        ],
      };*/    

      /*const openConnection = async () => {

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
        );
        
        await page.authenticate({'username':'admin', 'password': 'Notimation2020'});
        //await page.setViewport({ width: 1680, height: 1050 });
        
        //return { browser, page };
        return page;

      };*/
      
      /*const closeConnection = async (page, browser) => {
        page && (await page.close());
        browser && (await browser.close());
      };*/


      exports.saveSMS = functions.https.onRequest((req, res) => {
        
        //const _phone = req.data.phone;
        //const _name = req.data.name;
        //const _code = req.data.code;  

        const _phone = req.body.data.phone;
        const _name = req.body.data.name;
        const _code = req.body.data.code;  
        
        //const _phone = req.body.data.phone;
        //const _name = req.body.data.name;
        //const _code = req.body.data.code;  

          db.collection("sipef").add({
            phone: _phone,
            name: _name,
            code: _code
          })
          .then(function(docRef) {           
             
            postSMS(req, docRef, function(result){          

              res.send(result); 

            });  
            
          })        
          .catch(function(error) {
              console.error("Error adding document: ", error);
          });   
  
          //res.status(200).send(hola);
      });

      function postSMS(req, docRef, callback) {

        let _id = docRef.id; 

        const _phone = req.body.data.phone;
        const _name = req.body.data.name;
        const _code = req.body.data.code;

        const _payload = "http://noti.ms/" + _id;       

        var headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',     
            'Authorization': 'Bearer 7FA7ED241142E7BE36671CE0FEC9E84F'       
        };

        //var dataString = '{"phone":' + _phone + ',"name":"' + _name + ',"code":"' + _code + '"}';  
        var dataString = '{"recipient":' + _phone + ',"message":"' + _payload + '","service_id":"123"}';  

        console.log(dataString);

        var options = {
            url: 'https://api.notimation.com/api/v1/sms',
            method: 'POST',
            headers: headers,
            body: dataString
        };  

        request(options, function (error, response, body) {

            console.log("error: " + error); 
            console.log("response: " + response); 
            console.log("body: " + body); 

            console.log("_______________________________");

            if (!error) {

                let _body = JSON.parse(body);
                
                console.log("body: " + JSON.stringify(_body));              
                
                console.log("_______________________________");

                var _data = _body["data"];

                console.log("data: " + JSON.stringify(_data));              

                var smsid = _data["sms_id"];                         
                console.log("smsid: " + smsid);            

                return docRef.update({
                  sms_id: smsid
                })
                .then(function() {
                    //res.send(body); 
                    callback(smsid);
                })
                .catch(function(e) {                
                    console.error("Error updating document: ", e);
                    //res.send(e);
                    callback(e);
                });           
                
            } else {
                
                var _error = JSON.parse(error); 

                console.log(_error);

                callback(_error);
                
                //res.send(_error);

            }
            
        });       
      }

      app.get('/sipef', async function screenshotHandler(req, res) {
          
          const _id = req.query.id;
        
          if (!_id) {
            return res.status(400).send('No se encontro el Id');
          }
          


      });
     
      
    /*exports.gatewayClick = functions.https.onRequest((req, res) => {
        
      const browser = await puppeteer.launch({headless: false});
      const page = await browser.newPage();
      await page.setViewport({width: 1200, height: 720})
      await page.goto('https://www.daum.net', { waitUntil: 'networkidle0' }); // wait until page load
      await page.type('#id', CREDS.username);
      await page.type('#loginPw', CREDS.password);
      // click and wait for navigation
      await Promise.all([
                page.click('#loginSubmit'),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);      

    });*/


      // Handler to take screenshots of a URL.
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



    /*
    / Puppetter
    */

   
