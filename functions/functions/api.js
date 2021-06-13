    const {Storage} = require('@google-cloud/storage');

    const storage = new Storage();


     /**
        Envio de mensaje largo por gateway
    **/

    exports.send = functions.https.onRequest( async (req, res) => {

        const tokenId = req.get('Authorization').split('Bearer ')[1]; 

        if (tokenId === "WPEO622JDWHVIP80ZSHISB3GV84FE4") {

            const gateway = req.body.gateway;
            const port = req.body.port;
            const phone = req.body.phone;

            let response = `{   
            "status": "success",
                "data": {
                    "gateway": ${gateway},
                    "port": ${port},
                    "phone": "${phone}"
                }
            }`;

            let respJson = JSON.parse(response);

            console.log("respJson: " + JSON.stringify(respJson));

            var promises_switch = await new Promise( async (resolve, reject) => {            
            
                var promises = [];
    
                await firestore
                    .collectionGroup(date_ports)
                    .where(channelstatus, "in", ["Exist", "Using"])
                    .get().then(async (querySnapshot) => {
    
                    size = querySnapshot.docs.length;
    
                    querySnapshot.forEach(async (doc) => {
                        
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
                
                            //console.log("options: " + JSON.stringify(options));
                            //console.log("-------");
                
                            promises.push(rp(options));
    
                            if (count === (size-1)) {
                                resolve(promises);
                            }
    
                            count++;
    
                        }
                    }); 
    
                    return {};
                    
                }).catch((error) => {
                    console.log("error: " + error);
                    return error;
                });
                
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


   

    