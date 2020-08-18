	const {Firestore} = require('@google-cloud/firestore');
	const {Storage} = require('@google-cloud/storage');		
	const chromium = require("chrome-aws-lambda");	
	const {Logging} = require('@google-cloud/logging');

	const logging = new Logging();	
	const storage = new Storage();

	const PROJECTID = 'notims';
	const firestore = new Firestore({
	  projectId: PROJECTID,
	  timestampsInSnapshots: true,
	});			

 	exports.backend = async (req, res) => {	

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
				case 'hello': hello(req, res); break;
				case 'gateway': gateway(req, res); break;
				case 'convert': convertHtmlToImage(req, res); break;
				default: getDefault(req, res);
			}	

		} else {

			res.status(401).send("Invalid authorization");  
		}
	};

	const getDefault = function getDefault(req, res) { res.status(404).send('Bad URL'); }

	const gateway = async function(req, res) {

		var url;
		var gateway = parseInt(req.body.data.gateway);			
		let split = req.url.split('/')[2];

		console.log("gateway: " + gateway);  
		console.log("split: " + split);  
		
		var option = 0;
		switch (split) {			
			case 'switch': 
				option = 1; 
				let applyto = parseInt(req.body.data.applyto);	
				let url = req.body.data.url;	
				url = "http://s" + gateway + url + applyto;
			break;			
		}	

		if (option>0) {

			(async () => { 
				
				try {	 				

					let launchOptions = { headless: false, args: ['--start-maximized'] }; 

					const browser = await chromium.puppeteer.launch({
						args: chromium.args,
						defaultViewport: chromium.defaultViewport,
						executablePath: await chromium.executablePath,
						headless: chromium.headless,
						ignoreHTTPSErrors: true,
					});	    
					const page = await browser.newPage();      				

					await page.setViewport({width: 1366, height: 768});
					await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
					
					await page.authenticate({'username':'admin', 'password': 'Notimation2020'});															

					await page.goto("http://s"+ gateway + url);  

					if (option==1) {  

						const portsCount = (await page.$$('.select option')).length;                
						console.log("ports" + portsCount);     

						//disable
						const radios = await page.$$('input[name="SwitchMode"]');
						await new Promise((resolve, reject) => {
							radios.forEach(async (radio, i) => {
								console.log(i);            
								if (i === 5) {									
									radio.click();
									resolve();
								}
							});
						});

						var all = JSON.parse(req.body.data.all);	
						if (all) {							
							await page.click('.mr5'); 						
						}

						//submit
						await page.click('.mr20');            
						await page.on('dialog', async dialog => {
							await dialog.accept();							  
						}); 		
						
						return res.status(200).send({"ports":portsCount}); 			

					} else {

						return res.status(400).send("Option not found");
					}

					await browser.close();					     

				} catch(error) { 
					
					let resonse =  {
						"response" : "error",
						"error": error
					};   
					console.log("error: " + error);
					res.status(400).send(error);
					return error;
				}

			})();		

		} else {
			res.status(402).send("Option not found");
		}	

	};

	const convertHtmlToImage = async function(req, res) {

		const _value = req.body.data;	   
		let name = _value.name;
		let message = _value.message;
		let sms_id = _value.sms_id;
		let cobranzasId = _value.cobranzasId;       

		var image_name = cobranzasId + "_" + sms_id + ".png";       

		console.log('image_name:' + image_name);

		let _html = ""; //buildHTMLForImage(name, message).toString();    

		var screenshotBuffer = null;
		var browser = null;

		try {        

		browser = await chromium.puppeteer.launch({
		  args: chromium.args,
		  defaultViewport: chromium.defaultViewport,
		  executablePath: await chromium.executablePath,
		  headless: chromium.headless,
		  ignoreHTTPSErrors: true,
		});	    

		const page = await browser.newPage();      
		await page.setViewport({
		          width: 1200,
		          height: 630,
		          deviceScaleFactor: 1,
		        });
		await page.setContent(_html);       
		screenshotBuffer = await page.screenshot({encoding: "binary"});
		//screenshotBuffer = await page.screenshot({encoding: "base64"});
		await browser.close(); 

		} catch (e) {
		console.error(e);
		return e;
		}    

		var imageBuffer;
		var file;
		var image_path = `cobranzas/sipef/${image_name}`;

		try {  

		  const bucket = storage.bucket("notims.appspot.com");
		  imageBuffer = new Uint8Array(screenshotBuffer);
		  file = bucket.file(image_path, {
		      uploadType: {resumable: false}
		  });

		} catch (e) {
		console.error(e);
		return e;
		}  

		try {           

		  await file.save(imageBuffer).then( async (response) => {		    

			  const config = {
		        action: 'read',
		        expires: '03-01-2500',
		      };   

		      const imageUrl = await file.getSignedUrl(config); 

		      var _img = imageUrl[0].toString();			  	       	      

		      await firestore.collection("cobranzas").doc(cobranzasId).update(                  
		        {preview_image: _img, update:true}
		      ).then((document) => {

		      	var dataString = `{
		          "data" : {		           
		           "image_path":"${image_path}"		           
		          }
		         }`;
		      	
		      	res.status(200).send(dataString);
		        return document;

		      }).catch((error) => {
		        
		        console.log('Error updating:', error);
		        res.status(404).send(error);
		        return error;

		      });	

		  });

		} catch (e) {
			console.error(e);
			return e;
		}     

	};			



	const hello = async function(req, res)  {
		res.status(200).send("hello from backend");
	};
