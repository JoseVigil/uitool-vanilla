Base setup
===========
https://medium.com/@david_shortman/build-and-debug-firebase-functions-in-vscode-73efb76166cf

Firebase 
=========

Buscar las tres versiones mas actuales de firebase-tools firebase-admin y firebase-functions y modificarlas en functions/packages.json

https://www.npmjs.com/package/firebase-admin
https://www.npmjs.com/package/firebase-tools
https://www.npmjs.com/package/firebase-functions

```sh
npm install 
```

Si tira error y pide audit command correrlo, despues

```sh
npm install -g firebase-tools

npm i -D @firebase/testing

firebase setup:emulators:firestore
```

Debug

```sh
firebase emulators:start --inspect-functions
```
