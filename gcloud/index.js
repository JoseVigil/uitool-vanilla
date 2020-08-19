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

	const getDefault = function getDefault(req, res) { res.status(404).send('Bad URL'); }	

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

	var OPTION_SWITCH_STRATEGY = 'switchstrategy';
	var OPTION_USING_CARDS = 'using';
	var OPTION_COMPSUMPTION = 'consumption';
	
	const gateway = async function(req, res) {

		var url;
		var gateway = parseInt(req.body.data.gateway);			
		let option = req.url.split('/')[2];

		console.log("gateway: " + gateway);  
		console.log("split: " + option);  		
		
		switch (option) {			
			
			case OPTION_SWITCH_STRATEGY: 	
				let applyto = parseInt(req.body.data.applyto);
				let swurl = "http://s" + gateway + req.body.data.url + applyto;			
				let sparams = { "option" : option, "applyto" : applyto,	"url" : swurl	};					
				return browse(req, res, sparams);
				break;	

			case OPTION_USING_CARDS: 								 
				let uurl = "http://s" + gateway + req.body.data.url;
				let uparams = { "option" : option, "url" : uurl	};
				return browse(req, res, uparams);
				break;		

			case OPTION_COMPSUMPTION: 								 
				let curl = "http://s" + gateway + req.body.data.url;
				let cparams = { "option" : option, "url" : curl	};
				return browse(req, res, cparams);
				break;		

			default: 	
				res.status(402).send("Option not found");
				break;
		}	
	

	};

	const browse = async function(req, res, params) {	

		var option = params.option;	
		var url = params.url;		

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
				await page.goto(url);  

				switch (option) {			
			
					case OPTION_SWITCH_STRATEGY: 

						const portsCount = (await page.$$('.select option')).length;                
						console.log("ports" + portsCount);    

						var switch_strategy = parseInt(req.body.data.switch_strategy); 

						//disable
						const radios = await page.$$('input[name="SwitchMode"]');
						await new Promise((resolve, reject) => {
							radios.forEach(async (radio, i) => {								
								if (i === switch_strategy) {									
									radio.click();
									resolve();
								}
							});
						});

						//select all ports
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

					break;

					case OPTION_USING_CARDS: 

						var c = 0;
						var r = 0;
						var k = 0;

						const urows = await page.$$('.wid1 > tbody > tr > td i');
						var total = urows.length;

						var ujson = `{"channels":${total/4},"ports":${total},"sims":[`;

						await new Promise((resolve, reject) => {
							urows.forEach(async (row, i) => {         
							  
							  var parent = (await row.$x('..'))[0];  
							  var text = await page.evaluate(parent => parent.textContent, parent);                
							  var t = text.replace(/\s+/g, '');
							  
							  switch (c) {
							    case 0:
							      k = r + 1;
							      let aj = `{"port":"${k}","channel":[{"card":"A","status":"${t}"}`;
							      ujson += aj;
							    break;
							    case 1:      
							      let bj = `{"card":"B","status":"${t}"}`;
							      ujson += bj;
							    break;
							    case 2:              
							      let cj = `{"card":"C","status":"${t}"}`;
							      ujson += cj;
							    break;
							    case 3:
							      var dj = `{"card":"D","status":"${t}"}]}`;              
							      if (i<(total-1)) {     
							        dj += ",";
							      }
							      ujson += dj;
							    break;
							  }         

							  if (c==3) {                        
							    c=0;          
							    r++;
							    if (i==(urows.length-1)) { 
							      let tj = "]}";
							      ujson += tj;              
							      resolve();         
							    }         
							  } else {                   
							    let ej = "," ;
							    ujson += ej;                
							    c++;
							  } 

							});
						});      

						return res.status(200).send(ujson);

					break;

					case OPTION_COMPSUMPTION: 

						const crows = await page.$$('.wid1 > tbody > tr');
						var total = crows.length;

						console.log("total: " + total);

						var ujson = `{"ports":${total},"consumption":[`;

						await new Promise((resolve, reject) => {
							crows.forEach(async (row, i) => {  

							  var td = (await row.$x('td'))[4];
							  var text = await page.evaluate(td => td.textContent, td);  
							  
							  let spl = text.split("[");        
							  let a = parseInt(spl[1].split("]")[0]);
							  let b = parseInt(spl[2].split("]")[0]);
							  let c = parseInt(spl[3].split("]")[0]);
							  let d = parseInt(spl[4].split("]")[0]); 

							  ujson += `{"port":"${i+1}","channel":{"A":${a},"B":${b},"C":${c},"D":${d}}}`;           

							  console.log("text: " + text);
							  console.log("a: " + a);
							  console.log("b: " + b);
							  console.log("c: " + c);
							  console.log("d: " + d);    
							  
							  if (i==(crows.length-1)) { 
							    ujson += "]}";
							    console.log("ujson: " + ujson);
							    resolve();
							  } else {
							    ujson += ",";
							  }

							});       

						});						

						return res.status(200).send(ujson);

					break;

					default: 	
						res.status(402).send("Try other place");
					break;

				};

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
