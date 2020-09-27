    
    var firestoreService = require("firestore-export-import");
    var rp = require("request-promise");

    firestoreService.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,
    });  

    //Authorizaation
    //https://github.com/firebase/functions-samples/tree/master/authorized-https-endpoint

    exports.api = functions.https.onRequest( async (req, res) => {

        const tokenId = req.get('Authorization').split('Bearer ')[1];       

        const _recipient = req.body.data.recipient;
        const _message = req.body.data.message;
        const _ignore_banned = req.body.data.ignore_banned;
        const _service_id = req.body.data.service_id;

    });


    