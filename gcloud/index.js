
	const {Firestore} = require('@google-cloud/firestore');
	const {Storage} = require('@google-cloud/storage');
	const functions = require('firebase-functions');
	const puppeteer = require('puppeteer');	
	const PROJECTID = 'notims';

	const firestore = new Firestore({
	  projectId: PROJECTID,
	  keyFilename: '/key/notims-d14e46f9238c.json',
	  timestampsInSnapshots: true,
	});


	//const client = new Firestore.v1.FirestoreAdminClient();
	const storage = new Storage();

	//https://cloud.google.com/community/tutorials/cloud-functions-firestore

	exports.convertHtmlToImage = firestore
	      .doc('cobranzas/{cobranzasId}')
	      .onCreate( async (snap, context) => {         
	      
	      const newValue = snap.data();
	      let name = newValue.name;
	      let message = newValue.message;
	      let sms_id = newValue.sms_id;
	      let cobranzasId = context.params.cobranzasId;        

	      var image_name = cobranzasId + "_" + sms_id + ".png";       

	      console.log('image_nam:' + image_name);

	      let _html = buildHTMLForImage(name, message).toString();    
	    
	      var screenshotBuffer = null;
	      var browser = null;
	      
	      try {        

	        const browser = await puppeteer.launch({          
	          headless: false,
	          args: ['--no-sandbox', '--disable-setuid-sandbox'],
	        });

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

	      const bucket = storage().bucket("notimation-ms.appspot.com");
	      const imageBuffer = new Uint8Array(screenshotBuffer);
	      const file = bucket.file(`cobranzas/sipef/${image_name}`, {
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

	      let _time = firestore.FieldValue.serverTimestamp(); 

	      //await db.collection("cobranzas").doc(cobranzasId).update(            
	      await snap.ref.update(              
	        {preview_image: imageUrl.toString(), time_updated_image:_time}
	      ).then((document) => {
	        return document;
	      }).catch((error) => {
	        console.log('Error updating:', error);
	        return error;
	      }); 

	      function buildHTMLForImage (name, message) {
	        let _style = buildStyleForImage();
	        let html = `<html>
	            <head><style>
	                ${_style}
	            </style></head>
	            <body>
	                <div id="container">
	                    <div id="body">
	                        ${name}, ${message}
	                    </div>
	                    <div id="footer">
	                        <div id="author">
	                            <img id="author-img" src="nraboy.jpg">
	                            <div id="author-name">
	                                Nic Raboy
	                            </div>
	                        </div>
	                        <img id="brand-icon" src="icon.png">
	                    </div>
	                </div>
	            </body>    
	        </html>`;  
	        return html;
	    }

	    function buildStyleForImage () {
	        return `html, body {                        
	             width: 1200px;    
	             height: 630px;
	             margin: 0;
	             display: flex;            
	         }
	         #container {
	             flex: 1;
	             display: flex; 
	             flex-direction: column; 
	             border: 10px solid black; 
	             background-color: #931c22;
	             padding: 25px;
	             color: #FFFFFF;
	         }
	         #body {
	             flex-grow: 1; 
	             font-size: 4rem; 
	             display: flex;
	             align-items: center;
	             text-transform: uppercase;
	             font-weight: bold;
	             line-height: 6rem;
	         }
	         #footer {
	             display: flex; 
	             flex-grow: 0; 
	             flex-direction: row; 
	             align-items: center; 
	         }
	         #author {
	             flex-grow: 1;
	             display: flex;
	             flex-direction: row;
	             align-items: center;
	         }
	         #author-img {
	             width: 75px; 
	             height: 75px; 
	             margin-right: 25px;
	             border: 2px solid #FFFFFF;
	         }
	         #author-name {
	             font-size: 2.5rem;
	             margin-right: 10px;
	             text-transform: uppercase;
	         }
	         #brand-icon {
	             width: 75px;
	             height: 75px;
	             border: 2px solid #FFFFFF;
	         }`;
	     }

	    function buildStyle() {
	        return `* {
	        box-sizing: border-box;
	        }
	        body {
	        margin: 0;
	        }
	        .row{
	        display:flex;
	        justify-content:flex-start;
	        align-items:stretch;
	        flex-wrap:nowrap;
	        padding:10px;
	        }
	        .cell{
	        min-height:75px;
	        flex-grow:1;
	        flex-basis:100%;
	        }
	        @keyframes fadeEffect{
	        from{
	            opacity:0;
	        }
	        to{
	            opacity:1;
	        }
	        }
	        @media (max-width: 768px){
	        .row{
	            flex-wrap:wrap;
	        }
	        }
	        @media (max-width: 480px){
	        #ilb5{
	            padding:10px;
	        }
	        #imqo{
	            padding:10px;
	        }
	        #id2l{
	            height:304px;
	        }
	        #ihrf{
	            padding:10px;
	        }
	        #iz57{
	            height:160px;
	        }
	        #i0c54{
	            padding:10px;
	            text-align:center;
	            flex-direction:row;
	            align-items:stretch;
	            align-self:stretch;
	        }
	        #ir53b{
	            padding:10px;
	            text-align:center;
	        }
	        #i7sk2{
	            padding:10px;
	            text-align:center;
	        }
	        #i5olf{
	            height:35px;
	        }}`;
	    }  

	    function buildBody(nombre, mensaje, contacto) {
	        return `<div class="row" id="id2l">
	            <div class="cell" id="i8fz">
	            <div id="ilb5">${nombre}
	            </div>
	            <div id="imqo">${mensaje}
	            </div>
	            <div id="ihrf">${contacto}
	            </div>
	            <div class="row" id="i5olf">
	            </div>
	            <div class="row" id="iz57">
	                <div class="cell" id="iek0w">
	                <div id="i0c54">Llamar ${contacto}
	                </div>
	                <div id="ir53b">Whatsapp
	                </div>
	                <div id="i7sk2">No soy esa persona
	                </div>
	                </div>
	            </div>
	            </div>
	        </div>`;
	    }       

	    });
	    
	    
	    