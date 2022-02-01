//https://github.com/GoogleCloudPlatform/functions-framework-nodejs

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

//var MODULE_GATEWAY		= 'gateway';
//var MODULE_BUILD_IMAGE	= 'buildimage';

const timer = ms => new Promise( res => setTimeout(res, ms));

 exports.fromHTML = async (req, res) => {	

	 var autorization = req.body.data.autorization; 
	
	var buff = Buffer.from(autorization, 'base64'); 
	let key = buff.toString('ascii');

	var keys = key.split(":"); 

	let user = keys[0];
	let pass = keys[1];

	console.log("user: " +user);
	console.log("pass: " + pass);	

	if ( (user === "admin") && (pass === "Notimation2020") ) {

        //if (req.url.split('/')[1] == MODULE_BUILD_IMAGE) {
			//buildimage(req, res);
		//}		

		buildimage(req, res);
		
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
	var public_url 			= "https://noti.ms/composer/thumbnail?&path=/" + url_path + "&type=" + option;
	
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




			



