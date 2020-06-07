    
    const functions = require('firebase-functions');
    const firebase = require('firebase');
    var admin = require('firebase-admin');

    var serviceAccount = require("./key/notimation-ms-firebase-adminsdk-jbv0c-5463f12f44.json");
    var db_url = "https://notimation-ms.firebaseio.com";
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: db_url,
        //credential: admin.credential.applicationDefault()
    });
    const firestore = admin.firestore();

    const firebaseConfig = {
        apiKey: "AIzaSyBtxWKuwsGfMoDZ_0yDvC7w0SEbEno418U",
        authDomain: "notimation-ms.firebaseapp.com",
        databaseURL: "https://notimation-ms.firebaseio.com",
        projectId: "notimation-ms",
        storageBucket: "notimation-ms.appspot.com",
        messagingSenderId: "331232969906",
        appId: "1:331232969906:web:fee03f0058004ed84df5ab",
        measurementId: "G-QW5PLEMZTN"
    };
    firebase.initializeApp(firebaseConfig);

    // // Create and Deploy Your First Cloud Functions
    // // https://firebase.google.com/docs/functions/write-firebase-functions
    //

    exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebaseeeee!");

    });
