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

const timer = ms => new Promise( res => setTimeout(res, ms));

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

	var update, image_width, image_height, image_storage_name,
		image_storage_path, page_url, type; 

	let url_path 			= req.body.data.url_path;
	var public_url 			= "https://noti.ms/composer/thumbnail?&path=/" + url_path;
	var documentRef 		= firestore.doc(url_path);

	var paths = url_path.split("/");	

	switch (option) {	

		case BUILD_IMAGE_WEB:										
						
			let _image_web_			= paths[5] + "_web.png";
			let image_storage_web   = url_path.split(paths[4])[0];							
			image_width 			= req.body.data.image_width;	
			image_height 			= req.body.data.image_height;					
			image_storage_path		= `${image_storage_web}${_image_web_}`;
			image_storage_name		= "web_image_storage";
			update 					= "web_update";			
			type 					= "web";
			public_url 				+= "&type=web";	 
			break;

		case BUILD_IMAGE_PREVIEW:
					
			let _image_preview_		= paths[5] + "_preview.png";
			let image_storage_prev	= url_path.split(paths[4])[0];							
			image_width 			= req.body.data.image_width;	
			image_height 			= req.body.data.image_height;					
			image_storage_path		= `${image_storage_prev}${_image_preview_}`;
			image_storage_name		= "preview_image_storage";
			update 					= "preview_update";		
			type 					= "preview";			
			public_url 				+= "&type=preview";	 
			break;

	}

	console.log('image_storage_path: ' + image_storage_path);				
	console.log('url_path: ' + url_path);
	console.log('public_url: ' + public_url);
	
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

		await page.goto(public_url, {waitUntil: 'load', timeout: 0});	
		await timeout(5000);
	
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
			"public_image_${type}": "${image_url}",
			"${image_storage_name}" : "${image_storage_path}",
			"${update}": false
		  }`;	
		  
		  await documentRef.update(JSON.parse(json_update)).then((document) => {

			  var dataString = `{
			  "data" : {
			  "type":"${type}",		           
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
var OPTION_SEND_ONLY 			= 'sendonly';
var OPTION_SEND_WEB 			= 'sendweb';
var OPTION_SMS_RECEIVED    		= 'smsreceived';
var OPTION_REBOOT		    	= 'reboot';	
var OPTION_BUILD_IMAGE			= 'buildimage';	
var OPTION_USSD_SEND   			= 'ussdsend';
var OPTION_USSD_READ   			= 'ussdread';
var OPTION_SAVE_PHONE		    = 'savephone';


const gateway = async function(req, res) {

	var url;
	var gateway = parseInt(req.body.data.gateway);			
	let option = req.url.split('/')[2];

	console.log("gateway: " + gateway);  
	console.log("option: " + option);  	

	var port = 8000 + gateway; 	
	
	switch (option) {								

		case OPTION_USING: 											 
		case OPTION_MANAGMENT: 
		case OPTION_STATUS: 
		case OPTION_REBOOT: 					 
			let url = "http://synway.notimation.com:" + port + req.body.data.url;
			let params = { "option" : option, "url" : url, "gateway" : gateway };
			return browse(req, res, params);
			break;		

		case OPTION_SWITCH_SIM: 	
			let applyto = parseInt(req.body.data.applyto);
			let swurl = "http://synway.notimation.com:" + port + req.body.data.url + applyto;			
			let sparams = { "option" : option, "applyto" : applyto,	"url" : swurl	};					
			return browse(req, res, sparams);
			break;	

		case OPTION_SEND:
		case OPTION_SEND_ONLY: 
			console.log("__1__");								 
			let seurl = "http://synway.notimation.com:" + port + req.body.data.url + "?ch=" + req.body.data.channel;				
			let separams = { "option" : option, "url" : seurl };
			return browse(req, res, separams);
			break;

		case OPTION_SEND_WEB:							
			let weurl = "http://synway.notimation.com:8009/en/5-3-3SMSsending.php";				
			let wseparams = { "option" : option, "url" : weurl };
			return browse(req, res, wseparams);
			break;

		case OPTION_SMS_RECEIVED: 	
			let reurl = "http://synway.notimation.com:" + port + req.body.data.url + req.body.data.channel + "&type=r&card=" + req.body.data.card + "&page=" + req.body.data.pagenumber;
			let reparams = { "option" : option, "url" : reurl };
			return browse(req, res, reparams);
			break;		

		case OPTION_BUILD_IMAGE:
			return buildimage(req, res);
			break;

		case OPTION_USSD_SEND:
		case OPTION_USSD_READ: 					 
			let ussurl = "http://synway.notimation.com:" + port + req.body.data.url;
			let uchannels = req.body.data.channels;
			let ussparams = { 
				"option" : option, 
				"url" : ussurl, 
				"gateway" : gateway,
				"channels" : uchannels 
			};
			return browse(req, res, ussparams);
			break;

		case OPTION_SAVE_PHONE:	
			let spsurl = "http://synway.notimation.com:" + port + req.body.data.url;
			let scard = req.body.data.card;
			console.log();
			console.log("spsurl: " + spsurl);
			console.log();
			let spparams = { 
				"option" : option, 
				"url" : spsurl, 
				"gateway" : gateway,
				"card" : scard 
			};
			return browse(req, res, spparams);
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
			await page.setDefaultNavigationTimeout(0);

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

				case OPTION_SEND_WEB:

					try { 

						await page.evaluate("load_word(" + req.body.data.info + ");");

						await page.waitFor(2000);	

					} catch (e) {							
						return res.status(500).send(e);							
					}

				break;

				case OPTION_SEND:
				case OPTION_SEND_ONLY:

					console.log("__2__");								 

					try {
											

						const phoneInput = 'textarea[name=sendtoPhoneNumber]';
						var recipient = req.body.data.recipient;
						await page.waitForSelector( phoneInput, { timeout: 0 });
						await page.focus(phoneInput);
						await page.keyboard.type(recipient);

						console.log("__	__");					        

						const msgInput = 'textarea[name=MessageInfo]';
						const msg = req.body.data.message;
						await page.waitForSelector( msgInput, { timeout: 0 });
						await page.focus(msgInput);
						await page.keyboard.type(msg);					        

						console.log("__4__");

						await page.on('dialog', async dialog => {                               
						  await dialog.accept();	                  
						});					        
										 
						console.log("__5__");

						//submit
						await page.click('#send');
						await page.waitForFunction('document.getElementById("SMSResult").value != ""');					        

						console.log("__6__");	

						if (option==OPTION_SEND) { 

							console.log("__7__");	

							console.log("option==OPTION_SEND");					      
							
							await page.waitFor(2000);	

							var sjson;				

							var sending = 0;

							var countGetResponse = 0;

							async function resend(page, req) { 

								console.log("__10__");

								console.log("sending: " + sending);

								if (sending>5) {

									let status = "Failed";	
									sjson += `"status":"${status}"}`;	
									sending = 0;																	

								} else {										
								
									await timer(1000);
									await getResponse(page, req);									

								}					        	

								sending++;

							}

							async function getResponse(page, req) { 

								console.log("__9__");

								countGetResponse++;	

								console.log("countGetResponse: " + countGetResponse);								

								var el = await page.$("#SMSResult");
								var resutl = await page.evaluate(el => el.value, el);						        

								var lines = resutl.split("\n");
								var _channel = parseInt(req.body.data.channel) + 1;							        

								if (lines.length>0) {

									sjson = "";

									console.log("lines.length: " + lines.length);

									var headers;

									sjson = `{"gateway":"${req.body.data.gateway}","card":"${req.body.data.card}","number":"${recipient}","port":"${_channel}",`; 

									var cleanedLines = [];

									for (var j = 0; j < lines.length; j++) {

										let line = lines[j];

										if ( (line !== undefined) && (line !== "") ) {

											let spaces = line.split(" ");

											console.log("line: " + JSON.stringify(spaces));

											var _port = 0;
											var port5 = parseInt(spaces[5]);
											var port6 = parseInt(spaces[6]);

											console.log("port5: " + port5 + " port6: " + port6);

											if ( isNaN(port5) ) {													
												_port = port6;
											} else {
												_port = port5;
											}

											console.log("_port: " + _port + " _channel: " + _channel);
											
											if  ( _port === _channel ) {
												cleanedLines.push(line);
											}

										}
									}		

									console.log("cleanedLines: " + JSON.stringify(cleanedLines));

									if (cleanedLines.length > 0) {								

										let lastId = cleanedLines.length - 1;
										var last = cleanedLines[lastId];				

										console.log("last: " + last);									

										var status;										

										if ( last.indexOf("Success") > 0 ) {
											status = "Success";											
										} else if ( last.indexOf("Failed") > 0 ) {
											status = "Failed";																						
										} else if ( (last.indexOf("Sending") > 0) ) {																																				
											status = "Sending";	
										} else if ( (last.indexOf("Timeout") > 0) ) {																																				
											status = "Timeout";	
										} 	

										sjson += `"status":"${status}"}`;																									

										console.log("status: " + status);		

									} else {

										resend(page, req);
									}						

								} else {

									resend(page, req);

								}
								
							}

							console.log("__8__");

							await getResponse(page, req);
							console.log("sjson: " + sjson);

							return res.status(200).send({"result":JSON.parse(sjson)}); 				

						} else {

							console.log("option==OPTION_SEND_ONLY");

							sjson = `{"gateway":"${req.body.data.gateway}","channel":"${req.body.data.channel}"}`;

							console.log("json: " + sjson);
						}

						return res.status(200).send({"result":JSON.parse(sjson)}); 				
						
					} catch (e) {		

						console.log("error: "  + e);					
						return res.status(500).send({"result":"error","detail":e});							

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

							var channel = parseInt(req.body.data.channel);
							  
							if ( rawtext.includes("Bienvenido a Personal") ) {

								let raws = rawtext.split(",");

								let chnl = parseInt(raws[1]);

								if ( channel == chnl ) {

									let remote = raws[2];
									let time = raws[3];
									let content = raws[4];
									let simnumber = content.match(/{([^}]+)}/)[1];                  
									let portnumber = content.split("-{")[0];                
									let port = (chnl+1) + portnumber;                    

									let jsondata = `{
									  "channel":"${chnl}",
									  "time":"${time}",
									  "remote_number":"${remote}",
									  "time":"${time}",
									  "sim_number":"${simnumber}",
									  "port":"${port}"          
									}`;                   

									jsonArray.push(JSON.parse(jsondata));                                           
								}
							}	

							var movi_resp = "Su Numero de Linea es ";

							if ( rawtext.includes(movi_resp) ) {

								//console.log("rawtext: " + rawtext);
								
								let raws = rawtext.split(",");

								let chnl = parseInt(raws[1]);

								//console.log("channel: " + channel + " chnl: " + chnl);

								if ( channel == chnl ) {

									let remote = raws[2];
									let time = raws[3];
									let content = raws[4];
									//let simnumber = content.match(/{([^}]+)}/)[1];                  
									let portnumber = content.split("-{")[0];                
									let port = (chnl+1); // + portnumber;

									let simnumber = parseInt(rawtext.split(movi_resp)[1]);

									let jsondata = `{				                      
									  "channel":"${chnl}",
									  "time":"${time}",
									  "remote_number":"${remote}",				                      
									  "sim_number":"${simnumber}",
									  "card":"${req.body.data.card}",     
									  "port":"${port}"      
									}`;    

									//console.log("jsondata: " + JSON.stringify(jsondata));               

									jsonArray.push(JSON.parse(jsondata));  
								}

							}		 	              

							if (i==(total-1)) { 
							  resolve();
							}

						  });        

						});			            

						
						jsonArray.sort(function(a, b) {
							return new Date(b.time) > new Date(a.time);
						});							

						//const sortedArray = jsonArray.sort((a, b) => new Date(a.time) - new Date(b.time));			            

						//console.log("jsonArray: " + JSON.stringify(jsonArray));               

						let first = jsonArray[0];

						//console.log("first: " + JSON.stringify(first));               

						/*let jalength = jsonArray.length;
						var json = `{"rows":${jalength},"sim_numbers":[`;            				            
						  
						if (jalength>0) {

						  for (var j=0; j<jalength;j++) {
							
							json += JSON.stringify(jsonArray[j]);            
							
							if (j==(jalength-1)) {                  
							  json += "]}";							                    
							} else {
							  json += ",";
							}
						  }           
						  
						} else {           
						  json += `0]}`;            
						}*/         

						res.status(200).send({result:first});

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

				case OPTION_USSD_SEND:

					try { 

						await page.select('#USDDDefaultEncoding', 'UCS2')

						var channels = params.channels;
						let clength = channels.length;

						console.log("channels: " + JSON.stringify(channels));							

						console.log("clength: " + clength);

						for (var i=0; i<clength; i++) {
							let id = channels[i];
							let clas = "Checkbox" + id;	
							//console.log("clas: " + clas);					
							await page.click('#' + clas);
							await page.waitFor(1000);
						}

						const sendInput = 'textarea[name=USSDAll]';
						const mesg = "*22#";
						await page.waitForSelector( sendInput, { timeout: 0 });
						await page.focus(sendInput);
						await page.keyboard.type(mesg);

						await page.on('dialog', async dialog => {                               
						  await dialog.accept();	                  
						});					                     	              
					   
						await page.evaluate("check(NetSet);");  													

						return res.status(200).send(true);

					} catch (e) {							
						return res.status(500).send(e);							
					}

				break;		

				case OPTION_USSD_READ:

					try { 

						await page.select('#USDDDefaultEncoding', 'UCS2');

						await page.waitFor(12000);							

						var ussdtextareas = await page.$$('textarea');							 

						var channels = params.channels;
						var ulength = channels.length;

						console.log("channels: " + JSON.stringify(channels));

						var count = 0;					

						var jsonUssdArray = await new Promise((resolve, reject) => {			                

							var tempJson = "[";

							ussdtextareas.forEach(async (textarea, i) => {									

								if (channels.includes(i)) {

									console.log("i: " + i);

									console.log("textarea: " + textarea);

									var title = await (await textarea.getProperty('title')).jsonValue();                   
									
									console.log("title length: " + title.length);	
									console.log("title: " + title);

									//var _includes = false;	

									let j = i+1;
									  
									if ( title.includes("Claro") ) {					                

										//var _includes = true;

										var tempUssd = title.substring(title.indexOf("Claro") + 6);
										var _number = tempUssd.substring(0, tempUssd.indexOf(" con Plan Control"));
									
										console.log("_number: " + _number);
																					
										let _json = `{"channel":${j},"phone":"${_number}"}`;
										tempJson +=  _json;                					                    

									} else {

										let _jsonc = `{"channel":${j}}`;
										tempJson +=  _jsonc;
									}

									console.log("count: " + count);
									console.log("ulength: " + ulength);

									if (count == (ulength-1)) {	
										var lastChar = tempJson.substr(tempJson.length - 1); 
										console.log("lastChar: " + lastChar);
										if (lastChar==","){
											tempJson = tempJson.slice(0, -1); 
											console.log("tempJsonWithout,: " + tempJson);
										}
										tempJson += "]";
										  resolve(tempJson);
									} else {
										//if (_includes) {
											tempJson += ",";
										//}
									}
									console.log("tempJson: " + tempJson);
									count++;
								}

							});
						});								

						var responseArray = JSON.parse(jsonUssdArray);

						console.log("responseArray: " + JSON.stringify(responseArray));											

						//console.log("responseArray: " + responseArray);

						return res.status(200).send(responseArray);

					} catch (e) {	
						console.log("ERRORRRR: " + e);						
						return res.status(500).send(e);							
					}

				break;		
				
				case OPTION_SAVE_PHONE:

					try { 
						
						console.log("__0__");
						
						//var channels = params.channels;
						//var slength = channels.length;

						//nsole.log("channels: " + JSON.stringify(channels));
						//console.log("slength: " + slength);

						//var tempJson = "[";
						//var count = 0;

						console.log("__1__");
						console.log("__2__");					

						//console.log("tempJson: " + tempJson);
						
						//var card = channels[i];
						
						var card = params.card;

						console.log("modify: " + JSON.stringify(card));
						
						await page.select('#Port',  card.port.toString());

						console.log("__3__");

						await page.waitFor(2000);

						console.log("__4__");

						const sendInput = 'input[name="PhoneNumber"]';						
						await page.waitForSelector( sendInput, { timeout: 0 });
						await page.focus(sendInput);
						await page.keyboard.type(card.phone.toString());

						console.log("__5__");	
						
						//tempJson +=  _json;

						//console.log("tempJson: " + tempJson);
					
						//await page.click('input[name="save"]'); 

						page.$eval('input[name="save"]', elem => elem.click());

						//await page.evaluate("form_check(mobilemodify);"); 
						
						console.log("__6__");

						await page.on('dialog', async dialog => { 
							console.log("dialog.accept");                              
							await dialog.accept();	 							            
						});		
						
						await page.waitFor(20000);

						console.log("__7__");								

						let _response = `{"card":"${card.card}","channel":${card.port},"path":"${card.path}","phone":${card.phone}}`;

						console.log("_response: " + _response);

						console.log("__8__");
								
						return res.status(200).send(JSON.parse(_response));	
								 

					} catch (e) {	
						console.log("error: " + e);						
						return res.status(500).send(e);							
					}

					/*try { 
						
						console.log("__0__");
						
						var channels = params.channels;
						var slength = channels.length;

						console.log("channels: " + JSON.stringify(channels));
						console.log("slength: " + slength);

						var tempJson = "[";
						var count = 0;

						console.log("__1__");

						var jsonSaveArray = await new Promise( async (resolve, reject) => {			                							

							console.log("__2__");

							for (var i=0; i<slength; i++) {

								console.log("__i: " + i);

								console.log("tempJson: " + tempJson);
								
								var card = channels[i];

								console.log("card: " + JSON.stringify(card));
								
								await page.select('#Port',  card.port.toString());

								console.log("__3__");

								await page.waitFor(2000);

								console.log("__4__");

								const sendInput = 'input[name=PhoneNumber]';						
								await page.waitForSelector( sendInput, { timeout: 0 });
								await page.focus(sendInput);
								await page.keyboard.type(card.phone.toString());

								console.log("__5__");	

								let _json = `{"card":"${card.card}","channel":${card.port},"path":"${card.path}","phone":${card.phone}}`;
								tempJson +=  _json;

								console.log("tempJson: " + tempJson);
							
								//await page.click('input[name="save"]'); 

								page.$eval("#mobilemodify", elem => elem.click());

								//await page.evaluate("form_check(mobilemodify);"); 
								
								console.log("__6__");

								await page.on('dialog', async dialog => { 
									console.log("dialog.accept");                              
									await dialog.accept();	                  
								});		
								
								await page.waitFor(10000);

								console.log("__7__");

								if (count == (slength-1)) {										
									tempJson += "]";
									console.log("resolve: " + tempJson);
									resolve(JSON.parse(tempJson));
								} else {									
									tempJson += ",";									
									await page.waitFor(2000);
								}								
								count++;			
								
								//console.log("__8__");

							};
						
						});
						 
						if (jsonSaveArray.length>0) {
							return res.status(200).send(_response);
						} else {
							return res.status(404).send(false);
						}	

					} catch (e) {	
						console.log("error: " + e);						
						return res.status(500).send(e);							
					}*/

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


			


