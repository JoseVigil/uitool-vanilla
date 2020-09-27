    
    var firestoreService = require("firestore-export-import");
    var rp = require("request-promise");

    firestoreService.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,
    });  

    exports.api = functions.https.onRequest( async (req, res) => {

            

    });


    