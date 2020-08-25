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
				case 'gateway': gateway(req, res); break;
				case 'convert': convertHtmlToImage(req, res); break;
				default: getDefault(req, res);
			}	

		} else {

			res.status(401).send("Invalid authorization");  
		}
	};

	var OPTION_SWITCH_SIM    		= 'switchsim';
	var OPTION_USING 			    = 'using';
	var OPTION_COMPSUMPTION 		= 'consumption';
	var OPTION_STATUS 				= 'status';
	var OPTION_SEND 				= 'send';
	var OPTION_SIMS_RECEIVED    	= 'simsreceived';
	var OPTION_REBOOT		    	= 'reboot';
	
	const gateway = async function(req, res) {

		var url;
		var gateway = parseInt(req.body.data.gateway);			
		let option = req.url.split('/')[2];

		console.log("gateway: " + gateway);  
		console.log("option: " + option);  		
		
		switch (option) {					
			

			case OPTION_USING: 											 
			case OPTION_COMPSUMPTION: 
			case OPTION_STATUS: 
			case OPTION_REBOOT: 								 
				let url = "http://s" + gateway + req.body.data.url;
				let params = { "option" : option, "url" : url, "gateway" : gateway };
				return browse(req, res, params);
				break;		

			case OPTION_SWITCH_SIM: 	
				let applyto = parseInt(req.body.data.applyto);
				let swurl = "http://s" + gateway + req.body.data.url + applyto;			
				let sparams = { "option" : option, "applyto" : applyto,	"url" : swurl	};					
				return browse(req, res, sparams);
				break;	

			case OPTION_SEND: 								 
				let seurl = "http://s" + gateway + req.body.data.url + "?ch=" + req.body.data.channel;
				let separams = { "option" : option, "url" : seurl };
				return browse(req, res, separams);
				break;	

			case OPTION_SIMS_RECEIVED: 								 
				let reurl = "http://s" + gateway + req.body.data.url + req.body.data.channel + "&type=r&card=T&page=" + req.body.data.pagenumber;
				let reparams = { "option" : option, "url" : reurl };
				return browse(req, res, reparams);
				break;		

			default: 	
				res.status(402).send("Option not found");
				break;
		}	

	};

	const browse = async function(req, res, params) {	

		var option = params.option;	
		var url = params.url;	

		console.log("option: " + option);  
		console.log("url: " + url); 

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

				case OPTION_USING: 

						try { 

							let gateway = params.gateway;	

							var c = 0;
							var r = 0;
							var k = 0;

							const urows = await page.$$('.wid1 > tbody > tr > td i');
							var total = urows.length;

							var ujson = `{"gateway":${gateway}, "channels":${total/4},"ports":${total},"sims":[`;

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
  

							return res.status(200).send({"response":JSON.parse(ujson)});

						} catch (e) {							
							return res.status(500).send(e);							
						}

					break;		
			
					case OPTION_SWITCH_SIM: 

						try { 

							const portsCount = (await page.$$('.select option')).length;                						

							var switch_mode = parseInt(req.body.data.switch_mode); 

							//disable
							const radios = await page.$$('input[name="SwitchMode"]');
							await new Promise((resolve, reject) => {
								radios.forEach(async (radio, i) => {								
									if (i === switch_mode) {									
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

						} catch (e) {							
							return res.status(500).send(e);							
						}	

					break;

					

					case OPTION_COMPSUMPTION: 

						try { 

							const crows = await page.$$('.wid1 > tbody > tr');
							var total = crows.length;						

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

						} catch (e) {							
							return res.status(500).send(e);							
						}

					break;

					case OPTION_STATUS:

						try { 

							const srows = await page.$$('.wid1 > tbody > tr');
							var total = srows.length;					

							var sjson = `{"ports":${total},"consumption":[`;

							await new Promise((resolve, reject) => {
								srows.forEach(async (row, i) => {  

								  var tdstatus = (await row.$x('td'))[7];          
								  const stat = await (await tdstatus.getProperty('title')).jsonValue();                   
								 
								  let spl = stat.split("[");   
								  let a = spl[1].split("]")[0];
								  let b = spl[2].split("]")[0];
								  let c = spl[3].split("]")[0];
								  let d = spl[4].split("]")[0];                    
								 
								  var tdop = (await row.$x('td'))[13];
								  var operator = await page.evaluate(tdop => tdop.textContent, tdop);                             
								  
								  sjson += `{"port":"${i+1}","operator":"${operator}","channel":{"A":"${a}","B":"${b}","C":"${c}","D":"${d}"}}`;           
								  
								  if (i==(srows.length-1)) { 
								    sjson += "]}";							    
								    resolve();
								  } else {
								    sjson += ",";
								  }

								});       

							});						

							return res.status(200).send(sjson);

						} catch (e) {							
							return res.status(500).send(e);							
						}

					break;

					case OPTION_SEND:

						try {      							

							const phoneInput = 'textarea[name=sendtoPhoneNumber]';
					        const recipient = req.body.data.recipient;
					        await page.waitForSelector( phoneInput, { timeout: 0 });
					        await page.focus(phoneInput);
					        await page.keyboard.type(recipient);

					        const msgInput = 'textarea[name=MessageInfo]';
					        const msg = req.body.data.message;
					        await page.waitForSelector( msgInput, { timeout: 0 });
					        await page.focus(msgInput);
					        await page.keyboard.type(msg);

					        await page.on('dialog', async dialog => {                               
					          await dialog.accept();	                  
					        });
					                     	              
					        //submit
					        await page.click('#send');     
					      
					        await page.waitForFunction('document.getElementById("SMSResult").value != ""');
					        await page.waitFor(5000);
					        var el = await page.$("#SMSResult");
					        var resutl = await page.evaluate(el => el.value, el);

							var lines = resutl.split("\n");          
							var headers;
							var sjson = `{"gateway":"${req.body.data.gateway}","channel":"${req.body.data.channel}","sent":[`;							

							for (var l = 0; l < lines.length; l++) {								
								headers = lines[l].split(" ");
								for (var i = 0; i < headers.length; i++) {             								
								   var flag = false;
								   switch (i) {
								      case 2:
								        sjson += `{"day":"${headers[i]}"`;
								        flag=true;
								        break;
								      case 3:
								        sjson += `"time":"${headers[i]}"`;
								        flag=true;
								        break;
								      case 6:
								        sjson += `"port":"${headers[i]}"`;
								        flag=true;
								        break;
								      case 19:
								        sjson += `"number":"${headers[i]}"`;
								        flag=true;
								        break;
								      case 21:
								      case 22:  
								        if(headers[i] === "") {
								            continue;
								        }
								        sjson += `"status":"${headers[i]}"`;
								        flag=true;
								        break;
								    } 								    
								    if (flag) {
								      if (i === (headers.length-1)) {                  
								        if (l === (lines.length-2)) {
								          sjson += `}]}`;
								        } else {
								          sjson += `},`;
								        }
								      } else {                 
								          sjson += `,`;                  
								      }   
								    }								    
								}
							}
					        return res.status(200).send({"restult":JSON.parse(sjson)}); 				

						} catch (e) {							
							return res.status(500).send({"error":e});							
						}

					break;

					case OPTION_SIMS_RECEIVED:
					
          				try {   

				            const lrows = await page.$$('.wid1 tbody tr td a[href]');
				            var total = lrows.length;
				            
				            console.log("total: " + total);

				            var jsonArray = [];          

				            await new Promise((resolve, reject) => {
				              lrows.forEach(async (link, i) => {                       

				                let linkclick = await page.evaluate(link => link.getAttribute('onclick'), link);                          
				                let lars = linkclick.split("load_messageinfo");
				                let outputstr = lars[1].replace(/'/g,'');
				                var rawtext = outputstr.replace("(", "").replace(");", "").toString();                                                        
				                  
				                if ( rawtext.includes("Bienvenido a Personal") ) {

				                	let raws = rawtext.split(",");

				                    let chnl = parseInt(raws[1]);
				                    let remote = raws[2];
				                    let time = raws[3];
				                    let content = raws[4];
				                    let simnumber = content.match(/{([^}]+)}/)[1];                  
				                    let portnumber = content.split("-{")[0];                
				                    let port = (chnl+1) + portnumber;                    

				                    let jsondata = `{
				                      "channel":"${chnl}",
				                      "remote_number":"${remote}",
				                      "time":"${time}",
				                      "sim_number":"${simnumber}",
				                      "port":"${port}"          
				                    }`;                   

				                    jsonArray.push(jsondata);                                           
				                }				              

				                if (i==(total-1)) { 
				                  resolve();
				                }

				              });        

				            });

				            let jalength = jsonArray.length;
				            var json = `{"rows":${jalength},"sim_numbers":[`;            				            
				              
				            if (jalength>0) {

				              for (var j=0; j<jalength;j++) {
				                
				                json += jsonArray[j];            
				                
				                if (j==(jalength-1)) {                  
				                  json += "]}";							                    
				                } else {
				                  json += ",";
				                }
				              }           
				              
				            } else {           
				              json += `0]}`;            
				            }         

				            res.status(200).send(JSON.parse(json));

				      } catch (e) {
				        console.error(e);
				        res.status(400).send(e);
				        return e;
				      }


					break;

					case OPTION_REBOOT:

						await page.waitForSelector("#Reboot1", {
							visible: true,
						});  

						await page.on('dialog', async dialog => {              
							await dialog.accept();	                  
							return res.status(200).send({"status":"rebooted"});
						});
						                           
			
						await page.click('#Reboot1');    

					break;					

					default: 	
						return res.status(400).send("Bad Request");
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


