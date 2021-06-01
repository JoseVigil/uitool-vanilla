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


   

    