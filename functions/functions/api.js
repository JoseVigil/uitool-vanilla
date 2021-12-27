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


   

    