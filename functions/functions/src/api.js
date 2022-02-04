    const {Storage} = require('@google-cloud/storage');

    const storage = new Storage();


    var GetActiveDatePort = async function (automationId) {        

        var queueArray = await new Promise( async (resolve, reject) => {      
                       
            await firestore
                .doc("automation/presets")                                              
                .get()
                .then(document => {                

                let active_date_port = document.data().active_date_port;

                console.log("active_date_port: " + active_date_port);

                resolve(active_date_port);               
               
            });                
            
        });  

        return queueArray;

    }


     /**
        Envio de mensaje largo por gateway
    **/

    exports.send = functions.https.onRequest( async (req, res) => {

        const tokenId = req.get('Authorization').split('Bearer ')[1]; 

        if (tokenId === "WPEO622JDWHVIP80ZSHISB3GV84FE4") {

            const gateway = req.body.gateway;
            //const port = req.body.port;
            const phone = req.body.phone;

            console.log("gateway: "  + gateway);
            console.log("phone  :"  + phone);

            let response = `{   
            "status": "success",
                "data": {
                    "gateway": "${gateway}",                    
                    "phone": "${phone}"
                }
            }`;

            console.log("response: " + response);

            let respJson = JSON.parse(response);

            console.log("respJson: " + JSON.stringify(respJson));

            var active_date_port = await GetActiveDatePort();

            console.log("");
            console.log("active_date_port: " + active_date_port);
            console.log("");

            var send_message = await new Promise( async (resolve, reject) => {            
            
                var promises = [];               
    
                    
                        
                let parent = doc.ref.parent.parent;
    
                if (parent.id === gateway) {
                    //var gateway_number = parent.id.replace( /^\D+/g, '');
                    var port_number = doc.id.replace(/^\D+/g, "");
        
                    var num;
                    switch (card) {
                        case "A":
                        position = num = 0;
                        break;
                        case "B":
                        position = num = 1;
                        break;
                        case "C":
                        position = num = 2;
                        break;
                        case "D":
                        position = num = 3;
                        break;
                    }
        
                    //cambiar esta posicion
                    var info = parseInt(port_number) - 1 + ":" + position;
                    var port = 8000 + parseInt(gateway_number);

                    var options = {
                        'method': 'POST',
                        'hostname': 'synway.notimation.com',
                        'port': 8009,
                        'path': '/en/5-3-3SMSsending.php',
                        'headers': {
                            'Authorization': 'Basic YWRtaW46Tm90aW1hdGlvbjIwMjA=',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        'maxRedirects': 20
                    };

                    var postData = qs.stringify({
                        'action': 'SendSMS',
                        'info': '-1:0:3:1151812085:0:0:Hello'
                    });
        
                    var options = {
                        method: "POST",
                        uri: "http://synway.notimation.com:" + port + "/5-9-2SIMSwitch.php",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            Authorization: "Basic YWRtaW46Tm90aW1hdGlvbjIwMjA=",
                            Cookie: "PHPSESSID=3duuuba087srnotdfkda9d8to3",
                        },
                        form: {
                            action: "SIMSwitch",
                            info: info,
                        },
                    };
        
                    console.log("options: " + JSON.stringify(options));
                    console.log("-------");
        
                    promises.push(rp(options));

                    if (count === (size-1)) {
                        resolve(promises);
                    }

                    count++;

                }                  
    
            
                
            });

            return res.status(200).send(respJson);


        } else {

            res.status(401).send("Invalid authorization"); 

        }

    });

    exports.createUser = functions.https.onRequest( async (req, res) => {

        const key = req.headers.authorization.split('Bearer ')[1];
        
        if (key!=bearer_key) {
            res.status(403).send('Unauthorized');
        } else {

            res.set("Access-Control-Allow-Origin", "*");
            res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
            res.set('Access-Control-Allow-Headers', '*');    

            if (req.method === 'OPTIONS') {
                res.end();
            } else {

                var email = req.body.email; 
                var name = req.body.name;
                var surname = req.body.surname;
                var phone = req.body.phone;

                async function generatePassword (len) {
                    var pwd = [], cc = String.fromCharCode, R = Math.random, rnd, i;
                    pwd.push(cc(48+(0|R()*10))); 
                    pwd.push(cc(65+(0|R()*26))); 
                
                    for(i=2; i<len; i++){
                        rnd = 0|R()*62; 
                        pwd.push(cc(48+rnd+(rnd>9?7:0)+(rnd>35?6:0)));
                    }
                    return pwd.sort(function(){ return R() - .5; }).join('');
                }

                let pass = await generatePassword(15);
                let displayName = name + " " +  surname;

                var newUser = {
                    email: email,
                    emailVerified: true,
                    password: pass,
                    displayName: displayName,
                    phoneNumber: "+549" + phone,
                    disabled: false,
                };

                let createUserPromise = await new Promise( async (resolve, reject) => {

                    var userRecord, userId;

                    try {                   

                        console.log("-----------------------");
                        console.log(newUser);
                        console.log("-----------------------");

                        userRecord = await admin.auth().createUser(newUser);
                        

                    } catch (error) {
                        console.log("error failed to create a user: "+ error);
                        throw new functions.https.HttpsError('failed to create a user');
                    }

                    try {

                        console.log("-----------------------");
                        //console.log("userRecord.hub_vid: " + userRecord.hub_vid);
                        
                        userId = userRecord.uid;                
                        
                        console.log("userId: " + userId);
                        console.log("-----------------------");

                        let claim = {};
                        if(admins.indexOf( email ) !== -1) {
                            claim = { isAdmin: true }; 
                        } else {
                            claim = { isUser: true };
                        }

                        await admin.auth().setCustomUserClaims(userId, claim);

                        //https://www.toptal.com/firebase/role-based-firebase-authentication
                        //https://medium.com/firebase-tips-tricks/how-to-create-an-admin-module-for-managing-users-access-and-roles-34a94cf31a6e

                        resolve({user:userRecord});

                    } catch (error) {
                        console.log("error: "+ error);
                        throw new functions.https.HttpsError('failed to set Custom User Claims');
                    }                    

                });

                console.log("-----------------------");   
                console.log("createUserPromise: " + JSON.stringify(createUserPromise));
                console.log("-----------------------");

                let name_label = newUser.displayName.split(' ').join('_').toLowerCase();
                let uid = createUserPromise.user.uid;

                let account_data = {
                    uid:uid,
                    name:newUser.displayName,
                    name_label:name_label,
                    email:newUser.email,
                    password:newUser.password
                };

                console.log("-----------------------");   
                console.log("account_data: " + JSON.stringify(account_data));
                console.log("-----------------------");

                await firestore.collection("accounts").doc(uid).set(account_data, {merge:true})
                .then( (document) => { 

                    return res.status(200).send(account_data); 

                });
                
                
            }
        }        
    });

    exports.setAutomation =  functions.https.onRequest( async (req, res) =>  {    

        res.set("Access-Control-Allow-Origin", "*");
        res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', '*');         
        
        const key = req.headers.authorization.split('Bearer ')[1];
        
        if (key!=bearer_key) {
            res.status(403).send('Unauthorized');
        } else {       

            if (req.method === 'OPTIONS') {
                res.end();
            } else {

                var gateway = req.body.gateway; 

                console.log("-----------------------");   
                console.log("gateway: " + gateway);
                console.log("-----------------------");

                try {
    
                    let presets =  {
                        "gateway" : gateway,
                        "cards":["A","B","C","D"],
                        "current_card":"A",
                        "switch_cards": false,
                        "collect_data": false,
                        "collect_data_once": false,
                        "send_data": false,
                        "read_quenue": false,            
                        "read_data": false,
                        "count_read": 0,   
                        "save_number_queue":false,            
                        "save_number" : false,
                        "count_save_number":0,
                        "reset_state" : false,
                        "reset_state_count":0                                                  
                    }; 

                    await firestore.collection("automation").doc("presets").set(presets, {merge:true})
                    .then( (document) => { 

                        return res.status(200).send({"created":true}); 

                    });
                    
                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }

    });


    exports.setGateway =  functions.https.onRequest( async (req, res) =>  {    

        res.set("Access-Control-Allow-Origin", "*");
        res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', '*');         
        
        const key = req.headers.authorization.split('Bearer ')[1];
        
        if (key!=bearer_key) {
            res.status(403).send('Unauthorized');
        } else {       

            if (req.method === 'OPTIONS') {
                res.end();
            } else {    

                try {                         
                    
                    var gateway = req.body.gateway; 
                    var cards = req.body.cards;

                    console.log("-----------------------");   
                    console.log("gateway: " + gateway);
                    console.log("-----------------------");

                    let name = "S" + gateway;
                    
                    let gw = {                    
                        "number": gateway,                        
                        "gateway": name,
                        "cards": cards
                    };

                    console.log("-----------------------");   
                    console.log("gw: " + JSON.stringify(gw));
                    console.log("-----------------------");                    

                    await firestore.collection("gateways").doc(name).set(gw,{merge:true})
                    .then( (document) => { 
                        return res.status(200).send({"created":true}); 
                    });
                    
                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }

    });

    exports.setUrls =  functions.https.onRequest( async (req, res) =>  {    

        res.set("Access-Control-Allow-Origin", "*");
        res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', '*');         
        
        const key = req.headers.authorization.split('Bearer ')[1];
        
        if (key!=bearer_key) {
            res.status(403).send('Unauthorized');
        } else {       

            if (req.method === 'OPTIONS') {
                res.end();
            } else {                

                try {

                    let urls = {
                            "url_managment": "/en/10-6SMSManagement.php",
                            "url_send": "/en/5-3-2SMSsend.php",
                            "url_base_local": "http://localhost:5001/notims/us-central1",
                            "url_using": "/en/5-9SIM.php",
                            "url_ussd": "/en/5-5USSD.php",
                            "params_send": "/backend/gateway/send",
                            "params_send_only": "/backend/gateway/sendonly",
                            "url_domain": ".notimation.com",
                            "url_base_remote": "https://us-central1-notims.cloudfunctions.net",
                            "params_lock_switch": "/backend/gateway/lockswitch",
                            "url_lock_switch": "/en/5-9-1SIMSet.php",
                            "params_status": "/backend/gateway/status",
                            "params_ussdsend": "/backend/gateway/ussdsend",
                            "params_ussdread": "/backend/gateway/ussdread",
                            "url_base": "http://s",
                            "parmas_using": "/backend/gateway/using",
                            "parmas_managment": "/backend/gateway/managment",
                            "url_status": "/en/1-2chstatus.php",
                            "params_received": "/backend/gateway/smsreceived",
                            "url_received": "/en/5-3-1SMSinfo.php?ch=",
                            "url_sendweb": "/backend/gateway/sendweb",
                            "url_save_phone": "/en/5-2-1mobilemodify.php?id=",
                            "params_save_phone": "/backend/gateway/savephone"                            
                    }; 

                    await firestore.collection("gateways").doc("urls").set(urls, {merge:true})
                    .then( (document) => { 
                        return res.status(200).send({"response":true}); 
                    });
                    
                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }

    });

    exports.getUserPassword =  functions.https.onRequest( async (req, res) =>  {  

        res.set("Access-Control-Allow-Origin", "*");
        res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', '*');         
        
        const key = req.headers.authorization.split('Bearer ')[1];
        
        if (key!=bearer_key) {
            res.status(403).send('Unauthorized');
        } else {       

            if (req.method === 'OPTIONS') {
                res.end();
            } else {                

                try {

                    var email = req.body.email; 

                    admin.auth().getUserByEmail(email)
                    .then(function(userRecord) {

                        console.log("userRecord:", JSON.stringify(userRecord));

                        let pass = userRecord.password;

                        return res.status(200).send({"pass":pass});                 
                        
                    })
                    .catch(function(error) {
                        console.log("Error fetching user data:", error);
                        return res.status(400).send(error);   
                    });



                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }

        
    });

    exports.RebootAllGateways =  functions.https.onRequest( async (req, res) =>  {  

        res.set("Access-Control-Allow-Origin", "*");
        res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', '*');         
        
        const key = req.headers.authorization.split('Bearer ')[1];
        
        if (key!=bearer_key) {
            res.status(403).send('Unauthorized');
        } else {       

            if (req.method === 'OPTIONS') {
                res.end();
            } else {                

                try {

                    var promise_reboot = [];
                    var count = 0;
                    var size = 0;

                    let resutl_promise_reboot = await new Promise( async (resolve, reject) => {
  
                        const gatewaysRef = firestore.collection('gateways');  
                        gatewaysRef.get().then( async snapshot => {
                            
                            console.log("size: " + snapshot.size);

                            size = snapshot.size;

                            let _urls = GetURLS();
                            var _url = _urls.url_base_cloud_remote + _urls.params_reboot;
            
                            snapshot.docs.forEach( async doc => {            
                                
                                var id = doc.id;
                                let gateway = doc.data().number;
                                
                                let option_reboot = {
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

                                promise_reboot.push(rp(option_reboot));

                                if (count == (size-1)) {
                                    resolve(promise_reboot);
                                }
        
                                count++;
                            });

                        });          
                    
                    });
                    
                    return Promise.all(resutl_promise_reboot).catch((error) => {                                            
                        console.log("error post: " + error);                                          
                        return error;
                    });


                } catch (e) {
                    console.error(e);
                    return res.status(400).send(error);                
                }

            }
        }

        
    });


    


    //Authorizaation
    //https://github.com/firebase/functions-samples/tree/master/authorized-https-endpoint

    /*exports.message = functions.https.onRequest( async (req, res) => {

        const tokenId = req.get('Authorization').split('Bearer ')[1];       

        const _recipient = req.body.data.recipient;
        const _message = req.body.data.message;
        const _ignore_banned = req.body.data.ignore_banned;
        const _service_id = req.body.data.service_id;       

        async function uploadFile() {
            
            // Uploads a local file to the bucket
            await storage.bucket(bucketName).upload(filename, {
                // Support for HTTP requests made with `Accept-Encoding: gzip`
                gzip: true,
                // By setting the option `destination`, you can change the name of the
                // object you are uploading to a bucket.
                metadata: {
                // Enable long-lived HTTP caching headers
                // Use only if the contents of the file will never change
                // (If the contents will change, use cacheControl: 'no-cache')
                cacheControl: 'public, max-age=31536000',
                },
            });
            
            console.log(`${filename} uploaded to ${bucketName}.`);
        }

        uploadFile().catch(console.error);

    });*/

    /*exports.campaign = functions.https.onRequest( async (req, res) => {

        const tokenId = req.get('Authorization').split('Bearer ')[1]; 
        
        const client_id = req.body.data.client_id;
        const campaign_name = req.body.data.campaign_name;

        async function createBucket() {
            // Creates a new bucket in the Asia region with the coldline default storage
            // class. Leave the second argument blank for default settings.
            //
            // For default values see: https://cloud.google.com/storage/docs/locations and
            // https://cloud.google.com/storage/docs/storage-classes
          
            const [bucket] = await storage.createBucket(bucket_name, {
              location: 'us-central',
              storageClass: 'STANDARD',
            });
          
            console.log(`Bucket ${bucket.name} created.`);
          }

          createBucket().catch(console.error);
    });*/


   

    