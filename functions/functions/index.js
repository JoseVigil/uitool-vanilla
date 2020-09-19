    
        
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

    //const readXlsxFile = require('read-excel-file/node');

    /**
     * Remote gateway control
     */
    const puppeteer = require('puppeteer');

    //var Blob = require('node-blob');
    //var blobUtil = require('blob-util');    
    //var createObjectURL = require('create-object-url');   
    
    serviceAccount = require("./key/notims-firebase-adminsdk-rwhzg-9bd51fffc0.json");
    const { parse, join } = require('path');
    const { url } = require('inspector');

    db_url = "https://notims.firebaseio.com";
    var _payloadUrl = "http://noti.ms/";    
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,        
    });    

    firestoreService.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: db_url,        
    });
    
    firestore = admin.firestore();    
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

    //gateway
    exports.gateway = require("./gateway");

    /**
     * SERVER ALL INCOMING
     */

    var OPTION_COMPOSER         = 'composer';           

    const app = express();
    app.engine('html', engines.hogan); 
    app.set('views', path.join(__dirname, 'views'));   
    const cors = require('cors')({origin: true});
    app.use(cors);   
      
    app.get('*', (req, res) => {
        
        console.log("<<<<<<<<<<<<<<<<<<<<======================");

        console.log("req.path:", req.path); 
        
        var path = req.path.split('/')[1];

        console.log("req.path.split('/')[1]:" + path);

        switch (path) {                                  
          case OPTION_COMPOSER: Composer(req, res); break;                
          default: noti(req, res);
        } 
       
    });

    exports.app = functions.https.onRequest(app);

    var SERVER_ACTION           = 'action';
    var SERVER_GATEWAY          = 'gateway';
    var ACTION_EXPORT           = 'export'; 

    exports.server = functions.https.onRequest( async (req, res) => {

        console.log("<<<<<<<<<<<<<<<<<<<<======================");

        console.log("req.path:", req.path); 
        
        var path = req.path.split('/')[1];

        var user, pass;

        if ( path === SERVER_GATEWAY || path === SERVER_ACTION ) {          

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


    // NOTI
    const noti = async function(req, res) {            
        
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
    
    const Composer = async function(req, res) {       

      const pathParams = req.path.split('/');
      var module = pathParams[2];
      var url = req.url;
      var urlParams;
      
      if (url.indexOf('?') !== -1) {
        let params = url.split("?");
        urlParams = getJsonFromUrl(params[1]);        
      }     

      var static_url;     
      
      switch(module) {
        case "campaign":
          static_url = 'campaign_composer.html';
          break;
        case "web":
          static_url = 'web_composer.html';        
          break;
        case "preview":
          static_url = 'preview_composer.html';        
          break;  
        case "thumbnail":
          static_url = 'noti.html';
          break;
        default:
          static_url = 'composer.html';
          break;
      }

      return res.render(static_url, urlParams); 

      function getJsonFromUrl(url) {
        if (!url) url = location.search;
        var query = url.substr(1);
        var result = {};
        query.split("&").forEach(function(part) {
          var item = part.split("=");
          result[item[0]] = decodeURIComponent(item[1]);
        });
        return result;
      }

    }; 

    
    const Action = async function(req, res) { 

      let option = req.path.split('/')[2]; 
      var collection = req.body.data.collection; 
      
      console.log("option: " + option);
      console.log("collection: " + collection);
  
      switch (option) {
  
        case ACTION_EXPORT:          
           
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
                   
  
        default:  
          res.status(402).send("Option not found");
        //break;
      }   
      
    };   

    exports.triggerCampaign = functions.firestore
      .document('accounts/{accountId}/campaigns/{camapignId}/designs/{designId}')
      .onUpdate( async (change, context) => {  

        const newValue = change.after.data();                                        
        
        let web_update = newValue.web_update;
        let preview_update = newValue.preview_update;    
        
        if ( web_update || preview_update ) {     
          
          let encoded_path = newValue.encoded_path;
          
          var buff = Buffer.from(encoded_path, 'base64'); 
          let url_path = buff.toString('ascii');

          console.log("path: " + path);      
          
          var type, image_width, image_height;
          
          if (web_update) {
            type = "web";
            image_width = newValue.image_width_web;
            image_height = newValue.image_height_web;
          } else if (preview_update) {
            type = "preview";
            image_width = newValue.image_width_preview;
            image_height = newValue.image_height_preview;
          }
          
          let post_params = { 
            url_path: url_path,                                 
            image_width: image_width,
            image_height: image_height,
            autorization : "YWRtaW46Tm90aW1hdGlvbjIwMjA="            
          };         
          
          var build_image_web = `{
            "method": "POST",
            "uri": "https://us-central1-notims.cloudfunctions.net/backend/buildimage/${type}", 
            "timeout": "10000",
            "body": {
              "data" : ${JSON.stringify(post_params)}                  
            },
            "json": true 
          }`;       
          
          let _json = JSON.parse(build_image_web);                 

          await rp(_json)
          .then( async (response_image) => {

            console.log("response: " + JSON.stringify(response_image));            
            return response_image;

          }).catch((error) => {
      
            console.log("error: " + error);            
            return error;           

          });

        }
        
    }); 





















































































 






   