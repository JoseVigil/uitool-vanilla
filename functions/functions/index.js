           
    functions = require('firebase-functions');
    firebase = require('firebase');
    admin = require('firebase-admin');
    request = require('request');
      

    var firestoreService = require('firestore-export-import');      
    var path = require('path');       
    
    var pdfMake = require("pdfmake/build/pdfmake");
    var pdfFonts = require("pdfmake/build/vfs_fonts");
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
    var htmlToPdfmake = require("html-to-pdfmake");
    
    var rp = require('request-promise');       

    const express = require('express');
    var engines = require('consolidate');   

    const fs = require('fs'); 

    const readXlsxFile = require('read-excel-file/node');

    /**
     * Remote gateway control
     */    

    serviceAccount = require("./key/noti-gateways-firebase-adminsdk-2vseb-9294c130dd.json");   

    const { parse, join } = require('path');
    const { url } = require('inspector');

    db_url = "https://noti-gateways.firebaseio.com";
        
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,          
    });    

    /*firestoreService.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: db_url,             
    });*/
    
    const appName = 'notims'
    firestoreService.initializeApp(serviceAccount, appName);

    firestore = admin.firestore();    
    //const storage = admin.storage();

    const firebaseConfig = {
      apiKey: "AIzaSyCqHL-r0exNSssAxX_VZWQi5eNM3T3F4qk",
      authDomain: "noti-gateways.firebaseapp.com",
      databaseURL: "https://noti-gateways-default-rtdb.firebaseio.com",
      projectId: "noti-gateways",
      storageBucket: "noti-gateways.appspot.com",
      messagingSenderId: "699429402101",
      appId: "1:699429402101:web:34718cd8efa6b65ee45cbc",
      measurementId: "G-REFPNHRQ5S"
    };
    
    firebase.initializeApp(firebaseConfig);    
    firebase.functions().useFunctionsEmulator('http://localhost:5001');    

    const settings = {timestampsInSnapshots: true};          
    firestore.settings(settings);     
    
    //Admins
    admins = ["josemanuelvigil@gmail.com"];

    //Bearer Key
    bearer_key = "QZZ6WFDEfda9JMbLn0JT0NA3UvOoVmf0Texf2VHQEcW4T9Co0v";

    //api
    exports.api = require("./src/api");       

    //Control
    //exports.control = require("./src/control");   

    //cron
    exports.cron = require("./src/cron");
    
    /**
     * SERVER ALL INCOMING
     */

     var GetJsonFromUrl = async function (url) {
      if (!url) url = location.search;
      var query = url.substr(1);
      console.log("query: " + query);
      var result = {};
      query.split("&").forEach(function(part) {
        console.log("part: " + part);
        var item = part.split("=");
        result[item[0]] = decodeURIComponent(item[1]);
      });
      console.log();
      console.log("result: " + JSON.stringify(result));
      console.log();
      return result;
    }
   
    const app = express();
    app.engine('html', engines.hogan); 
    app.set('views', path.join(__dirname, 'views'));   
    const cors = require('cors')({origin: true});
    app.use(cors);   
      
    app.get('*', (req, res) => {
        
        console.log("<<<<<<<<<<<<<<<<<<<<======================");

        console.log("req.path:", req.path); 
        
        var pathParam = req.path.split('/')[1];

        console.log("pathParam:" + pathParam);       
        
        const pathParams = req.path.split('/');
        var module = pathParams[2];
        var url = req.url;
        var urlParams;
        
        if (url.indexOf('?') !== -1) {
          let params = url.split("?");
          urlParams = GetJsonFromUrl(params[1]);        
        }    
        
        console.log();
        console.log("///////////////");  
        console.log("pathParams :" + JSON.stringify(pathParams));  
        console.log("urlParams  :" + JSON.stringify(urlParams));  
        console.log("module     :" + module); 
        console.log("///////////////");   
        console.log();  

        var static_url;        
        
        switch (module) {
          default:
          case "gateways":
            static_url = 'gateways.html';
            break;         
        }

        if (urlParams) {
          return res.render(static_url, urlParams); 
        } else {
          return res.render(static_url); 
        }     
        
        
        
       
    });     
 
    exports.app = functions.https.onRequest(app);

    var SERVER_ACTION           = 'action';
    var SERVER_GATEWAY          = 'gateway';
    var ACTION_EXPORT           = 'export'; 
    var ACTION_REBOOT           = 'reboot'; 

    exports.server = functions.https.onRequest( async (req, res) => {

        res.set("Access-Control-Allow-Origin", "*");
        res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', '*');  

        console.log("<<<<<<<<<<<<<<<<<<<<======================");

        console.log("req.path: ", req.path); 
        
        var path = req.path.split('/')[1];

        console.log("path: ", path); 

        var user, pass;

        if ( path === SERVER_GATEWAY || path === SERVER_ACTION || path === ACTION_REBOOT ) {          

            var autorization = req.body.data.autorization;      
      
            var buff = Buffer.from(autorization, 'base64'); 
            let key = buff.toString('ascii');

            var keys = key.split(":");   

            user = keys[0];
            pass = keys[1];

        } else {

          user = "admin";
          pass = "Notimation2020";

        }

        console.log("user: " + user);
        console.log("pass: " + pass); 

        if ( (user === "admin") && (pass === "Notimation2020") ) {

          console.log("req.path.split('/')[1]:" + path);

          switch (path) {                        
            case SERVER_GATEWAY: GatewayOperations(req, res); break;
            case SERVER_ACTION: Action(req, res); break;              
          } 

        } else {
          res.status(401).send("Invalid authorization");  
        }    

    });    

    
    const Action = async function(req, res) { 

      let option = req.path.split('/')[2]; 
      var className = req.body.data.className; 
      
      console.log("option: " + option);
      console.log("className: " + className);
  
      switch (option) {
  
        case ACTION_EXPORT:          
           
            //http://localhost:5000/export/cobranzas
            //https://noti.ms/export/cobranzas 
            //.backup(collection)
  
            try {
  
              firestoreService
              .backup(className)              
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
          
          case ACTION_REBOOT:    

            try {

              console.log();
              console.log("REINICIANDO");
              console.log();

              let _urls = GetURLS();

              var _url = _urls.url_base_cloud_remote + _urls.params_reboot;

              var gateway = req.body.data.gateway; 

              var option_reboot = {
                  method: "POST",
                  uri: _url,
                  body: {
                      data: {
                          "gateway": gateway,
                          "url": _urls.url_reboot,                        
                          "autorization": "YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                      },
                  },
                  json: true,
              };

              console.log();
              console.log("option_reboot: " + JSON.stringify(option_reboot));
              console.log();

              await rp(option_reboot)
                  .then((results_reboot) =>  {
                  return res.status(200).send(results_reboot); 
              });
              

            } catch (e) {
              console.error(e);
              return res.status(400).send(error);                
            }

          break;   
                   
  
        default:  
          res.status(402).send("Option not found");
        //break;
      }   
      
    };   


   

    

  

















































 






   