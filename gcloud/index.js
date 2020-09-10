	const {Firestore} = require('@google-cloud/firestore');
	const {Storage} = require('@google-cloud/storage');		
	const chromium = require("chrome-aws-lambda");	
	const {Logging} = require('@google-cloud/logging');
	

	const htmlFunctions = require('./build_html.js');

	const logging = new Logging();	
	const storage = new Storage();

	const PROJECTID = 'notims';
	const firestore = new Firestore({
	  projectId: PROJECTID,
	  timestampsInSnapshots: true,
	});



	var MODULE_GATEWAY		= 'gateway';
	var MODULE_BUILD_IMAGE	= 'buildimage';

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
				case MODULE_BUILD_IMAGE: 	buildimage(req, res); break;
				case MODULE_GATEWAY: 		gateway(req, res); break;				
				default: getDefault(req, res);
			}	

		} else {

			res.status(401).send("Invalid authorization");  
		}
	};

	const getDefault = function getDefault(req, res) { res.status(404).send('Bad URL'); }	


	var BUILD_IMAGE_WEB			= 'web';
	var BUILD_IMAGE_PREVIEW		= 'preview';

	const buildimage = async function(req, res) {

		let option = req.url.split('/')[2];	

		var public_url, update, image_width, image_height, image_storage_name,
			image_storage_path, page_url, documentRef; 

		switch (option) {	

			case BUILD_IMAGE_WEB:
				
				let url_path 			= req.body.data.url_path;
				documentRef 			= firestore.doc(url_path);

				//accounts/kairos/campaigns/DEUDA_345_FDG/designs/sample

				let paths = url_path.split("/");	

				let image_name 			= paths[5];				
				let _image_ 			= image_name + "_web.png";
				var image_storage  		= url_path.split(paths[4])[0];							
				image_width 			= req.body.data.image_width;	
				image_height 			= req.body.data.image_height;					
				image_storage_path		= `${image_storage}${_image_}`;
				image_storage_name		= "web_image_storage";
				update 					= "web_update";				
 
				public_url = "https://noti.ms/composer/thumbnail?&path=/" + url_path;

				console.log('image_storage_path: ' + image_storage_path);				
				console.log('url_path: ' + url_path);
				console.log('public_url: ' + public_url);				

				//documentRef = firestore.collection("clients").doc(client)
		      	//.collection("campaigns").doc(campaign).collection(option).doc(design);
		      	
				break;

			case BUILD_IMAGE_PREVIEW:
			
				break;

		}		
		
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
	          width: image_width, //1200,
	          height: image_height, //630,
	          deviceScaleFactor: 1,
	        });

			switch (option) {				
				case BUILD_IMAGE_WEB:					
					await page.goto(public_url, {waitUntil: 'load', timeout: 0});	
					await timeout(5000);			
				break;
				case BUILD_IMAGE_PREVIEW:
					await page.setContent(html); 
				break;
			}

			screenshotBuffer = await page.screenshot({encoding: "binary"});
			//screenshotBuffer = await page.screenshot({encoding: "base64"});
			await browser.close(); 

		} catch (e) {
			console.error(e);
			return e;
		}    

		var imageBuffer, file;		

		try {  

		  const bucket = storage.bucket("notims.appspot.com");
		  imageBuffer = new Uint8Array(screenshotBuffer);
		  file = bucket.file(image_storage_path, {
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

		      var image_url = imageUrl[0].toString();   

		      let image_field = "preview_image_" + option;

		      var json_update = `{
				"public_image_web": "${image_url}",
				"${image_storage_name}" : "${image_storage_path}",
				"${update}": false
			  }`;	
		      
			  await documentRef.update(JSON.parse(json_update)).then((document) => {

		      	var dataString = `{
		          "data" : {		           
		           "image_storage_path":"${image_storage_path}",
				   "image_url":"${image_url}"			           		           
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

	async function timeout(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms));
	};


	var OPTION_SWITCH_SIM    		= 'switchsim';
	var OPTION_USING 			    = 'using';
	var OPTION_STATUS	 			= 'status';
	var OPTION_MANAGMENT 			= 'managment';
	var OPTION_SEND 				= 'send';
	var OPTION_SMS_RECEIVED    		= 'smsreceived';
	var OPTION_REBOOT		    	= 'reboot';		
	
	const gateway = async function(req, res) {

		var url;
		var gateway = parseInt(req.body.data.gateway);			
		let option = req.url.split('/')[2];

		console.log("gateway: " + gateway);  
		console.log("option: " + option);  		
		
		switch (option) {								

			case OPTION_USING: 											 
			case OPTION_MANAGMENT: 
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

			case OPTION_SMS_RECEIVED: 	

				let reurl = "http://s" + gateway + req.body.data.url + req.body.data.channel + "&type=r&card=" + req.body.data.card + "&page=" + req.body.data.pagenumber;
				let reparams = { "option" : option, "url" : reurl };
				return browse(req, res, reparams);
				break;		

			case OPTION_BUILD_IMAGE:
				return buildimage(req, res);
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
					

					case OPTION_MANAGMENT: 

						try { 

							const crows = await page.$$('.wid1 > tbody > tr');
							var total = crows.length;						

							var ujson = `{"ports":${total},"managment":[`;

							await new Promise((resolve, reject) => {
								crows.forEach(async (row, i) => {  

								  var td_used = (await row.$x('td'))[4];
								  var text_used = await page.evaluate(td_used => td_used.textContent, td_used);

								  console.log("text_used: " + text_used);  
								  
								  let spl = text_used.split("[");        
								  let a = parseInt(spl[1].split("]")[0]);
								  let b = parseInt(spl[2].split("]")[0]);
								  let c = parseInt(spl[3].split("]")[0]);
								  let d = parseInt(spl[4].split("]")[0]); 

								  var td_clear = (await row.$x('td'))[5];
								  var text_clear = await page.evaluate(td_clear => td_clear.textContent, td_clear);  

								  ujson += `{"port":"${i+1}","clear_sms_count":"${text_clear}","channel":{"A":${a},"B":${b},"C":${c},"D":${d}}}`;           								  

								  console.log("td_clear: " + td_clear);								  
								  
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

							var sjson = `{"gateway":${params.gateway},"ports":${total},"managment":[`;

							await new Promise((resolve, reject) => {
								srows.forEach(async (row, i) => {  

								  var tdport = (await row.$x('td'))[0];   
								  var port = await page.evaluate(tdport => tdport.textContent, tdport);   

								  var tdstatus = (await row.$x('td'))[7];          
								  const stat = await (await tdstatus.getProperty('title')).jsonValue();                   
								 
								  let spl = stat.split("[");   
								  let a = spl[1].split("]")[0];
								  let b = spl[2].split("]")[0];
								  let c = spl[3].split("]")[0];
								  let d = spl[4].split("]")[0];                    
								 
								  var tdop = (await row.$x('td'))[13];
								  var operator = await page.evaluate(tdop => tdop.textContent, tdop);   

								  var tdsignal = (await row.$x('td'))[10];
								  var signal = await page.evaluate(tdsignal => tdsignal.textContent, tdsignal);   
								  signal = signal.replace(/[{()}]/g, '');
								  
								  let charr = [a,b,c,d];
								  let using = charr.indexOf("Using");									  
								  
								  sjson += `{"port":"${port}","operator":"${operator}","signal":"${signal}","using":"${using}","channels":{"A":"${a}","B":"${b}","C":"${c}","D":"${d}"}}`;           
								  
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

							/*let all = (req.body.data.sendall === "true");
							let waitfor = 5000;

							console.log("all: " + all);

							if (all) {
								await page.waitFor(200);
								console.log("click all");
								await page.click('.btn4');
								waitfor=5000;
							}*/						 						

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
					        await page.waitFor(6000);
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
					        return res.status(200).send({"result":JSON.parse(sjson)}); 				

						} catch (e) {							
							return res.status(500).send({"error":e});							
						}

					break;

					case OPTION_SMS_RECEIVED:
					
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


				


