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

Si no puede instalar puppeteer correr 

```sh
export PUPPETEER_SKIP_DOWNLOAD='true'
```

Para emuladores locales

```sh
npm install -g firebase-tools

npm i -D @firebase/testing

firebase setup:emulators:firestore
```

Debug, si es necesario a inspeccionar un puerto especifico

```sh
firebase emulators:start --inspect-functions
```


To run Visual Studio Code with root access command

```sh
sudo code --user-data-dir="~/.vscode-root"
```

Imagen de HTML
==============

Para poder crear un preview de imagen normalmente se utiliza una libreria de node llamada puppeter. Despues de algunas pruebas locales donde logre crear una imagen pude darme cuenta que cuando hacia el deploy en el servidor no andaba. 

Concluyendo que es necesario crear una function con mayor capacidad de proceso tuve que crear una nueva funcion en Cloud Function con una cuota. Sin embargo no linkeaba con el proyecto firebase. 

https://console.cloud.google.com/functions/list?authuser=6&folder=&organizationId=&project=notims

Encontre que hay que crear el proyecto de firebase basado en el de cloud con la misma cuenta. 

https://medium.com/google-developers/whats-the-relationship-between-firebase-and-google-cloud-57e268a7ff6f


Push notification to WebApp
===========================

https://www.freecodecamp.org/news/how-to-add-push-notifications-to-a-web-app-with-firebase-528a702e13e1/#:~:text=Notifications%20with%20Firebase,any%20device%20using%20HTTP%20requests.


Import json
===========

```sh
cd noti-ms/functions/functions/import
node import.js emulate automation.json
node import.js emulate gateways.json
```