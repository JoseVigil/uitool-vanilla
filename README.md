<p align="center">
  <img src="images/noti.png" alt="Noti.ms"/>
</p>     

Noti.ms
=======

Proyecto destinado a la interacción con el usuario final de nuestros clientes generando valor agreado a la plataforma y permitiendo homologar buenas practicas con las empresas de telecomunicaciones. 

**Tecnologia**

El sistema se basa en la tecnologia de de backend usando Google Cloud Functions con Firebase y para los frontends bootstrap y google screadsheet con google script. Se puede usar como API o navegado. En la web se puede utilizar un composer de campañas para generar links con paginas web diseñadas en linea. 

Assets

- **Campaign Composer** 
- **Noti Designer** 
- **Gateway API**
- **SIM-X-PORT**

Gateway API
------------

La herramienta apunta a controlar y automatizar la utilizacion de los gateways. 

# Setup Firebase CLI reference and install local environment

https://firebase.google.com/docs/cli

Install Node

https://nodejs.org/ 

Install Cli for Windows stand alone or run npm command

```sh
npm install -g firebase-tools
```

# Login

In order to link a local account with a firebase account, you must initialize firebase while an active project is on the web, choose it. 

```sh
firebase login
```

## Functions (firebase backend endpoints)

To initialize the functions it is necessary to clone the branch 'functions' and install the firebase command line following [this guide] (https://firebase.google.com/docs/functions/local-emulator) and run the command.

```
git clone git@gitlab.com:notimation/noti-ms.git
```

To create a new branch

```sh
cd noti-ms
git checkout -b new_banch_name
git add -all
git commit -m "Nueva rama para maquetado"
git push origin new_banch_name
```

Install modules

```sh
cd noti-ms/functions/functions
npm install
```

Init commands
-------------

```sh
firebase init
```

Follow the wizard and aswer accordingly.

| Module  | Initialization | Response | 
| ---     |  ------  |---------:|
| Project | Which Firebase CLI features do you want to set up for this folder? Press Space to select features, then Enter to confirm your choices.  | Select all   |
| Database | What file should be used for Database Rules?  | ENTER (database.rules.json) |
| Database | File database.rules.json already exists. Do you want to overwrite it with the Database Rules for  from the Firebase Console?  | ENTER (N)  |
| Firestore |  What file should be used for Firestore Rules?  | ENTER (firestore.rules) |
| Firestore | File firestore.rules already exists. Do you want to overwrite it with the Firestore Rules from the Firebase Console?  | ENTER (N) |
| Firestore |  What file should be used for Firestore indexes?  | ENTER (firestore.indexes.json) |
| Firestore | File firestore.indexes.json already exists. Do you want to overwrite it with the Firestore Indexes from the Firebase Console?  | ENTER (N) |
| Functions | What language would you like to use to write Cloud Functions? | Javascript |
| Functions | Do you want to use ESLint to catch probable bugs and enforce style?  | Y |
| Functions | File functions/package.json already exists. Overwrite?  | ENTER (N) |
| Functions | File functions/index.js already exists. Overwrite?  | ENTER (N) |
| Functions | File functions/.gitignore already exists. Overwrite?  | ENTER (N) |
| Functions | Do you want to install dependencies with npm now?  | Y |
| Hosting |  What do you want to use as your public directory?  | ENTER (public) |
| Hosting |  Configure as a single-page app (rewrite all urls to /index.html)?  | ENTER (N) |
| Hosting |  File public/404.html already exists. Overwrite?  | ENTER (N) |
| Hosting |  File public/index.html already exists. Overwrite?  | ENTER (N) |
| Storage | What file should be used for Storage Rules?  | ENTER (storage.rules) |
| Emulators | Which Firebase emulators do you want to set up? Press Space to select emulators, then Enter to confirm your choices.  | Select All |
| Emulators | Which port do you want to use for the hosting emulator? | ENTER (5000) |
| Emulators | Would you like to download the emulators now? | Y |

To run Visual Studio Code with root access command. Notice when it runs disable git not to ask any more about it otherwise you can reach the point of having to compare each time there is a modification. Remove git activity from VS.

```sh
sudo code --user-data-dir="~/.vscode-root"
```

In case skipped installing repos run install into functions and functions/functions
```sh
npm install
```

Emulators
---------

Install tools

```sh
npm install -g firebase-tools

npm i -D @firebase/testing

firebase setup:emulators:firestore
```

Edit firebase.json and add the emulators

```sh
"emulators": {
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "database": {
      "port": 9000
    },
    "hosting": {
      "port": 5000
    },
    "pubsub": {
      "port": 8085
    },
    "ui": {
      "enabled": true,
      "host": "localhost",
      "port": 4002
    }    
  },
```

Emulators should be downloaded

**Start emulators**

```sh
sudo firebase emulators:start

``` 

If the port is busy, start with this command or change the port number above

```sh
"firestore": {
   port": 5003
},
```

```sh
sudo firebase serve
```

Deploy (only Jose)

```sh
sudo firebase deploy
```

Export firestore
----------------

Within  the admin panel admin menu -> backup, download the json file accordingly. 

Import firestore
----------------

Inside functions -> import folder there is an import.js file. place the downloaded file into files filder and import the json like so. The emulate parameter indicates thet is imported to the localhost, modify the por accordingly.

```sh
node import.js emulate contents.json
```

TODO: Fix formats

Steps Gateways API
==================

To execute the automation trigger these fields on automation class. Notice the gateway field should countain the desired gateway number. 

1. collect_data
2. send_data
3. read_data
4. read_quenue
5. send_data_again

```
{
    "automation": {
        "I4g5vWpYChvVv9SIj9Qw": {
            "collect_data": false,
            "send_data": false,
            "read_data": false,
            "read_quenue": false,
            "send_data_again": false,
            "gateway" :2,
            "count_read": 0,
            "count_send_again": 0,
            "subCollection": {}
        }
    }
}
```

