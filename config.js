// # Ghost Configuration for Azure Deployment
// Setup your Ghost install for various environments
// Documentation can be found at http://support.ghost.org/config/

var path = require('path'),
    websiteUrl = process.env.websiteUrl,
    websiteUrlSSL = process.env.websiteUrlSSL,
    mysqlHost = process.env.MYSQL_HOST,
    mysqlPort = process.env.MYSQL_PORT,
    mysqlUsername = process.env.MYSQL_USERNAME,
    mysqlPassword = process.env.MYSQL_PASSWORD,
    mysqlDatabase = process.env.MYSQL_DATABASE,
    config,
    database;

// Azure Feature
// ------------------------------------------------------------------------
// If the App Setting 'websiteUrl' is set, Ghost will use that URL as base.
// If it isn't set, we'll go with the default sitename.
if (!websiteUrl || websiteUrl === '' ||  websiteUrl.length === 0) {
    websiteUrl = 'http://' + process.env.siteName + '.azurewebsites.net';
    console.log(websiteUrl);
}

if (!websiteUrlSSL || websiteUrlSSL === '' ||  websiteUrlSSL.length === 0) {
    //in prod mode - forceSSL is true - so we can use the azure issued cert
    // web apps supply some default env variables - WEBSITE_SITE_NAME and WEBSITE_HOSTNAME
    // represent the siteName and the full DNS name respectively.
    // using the WEBSITE_HOSTNAME we don't have to append anything and would work in ASE too.
    websiteUrlSSL = 'https://' + process.env.WEBSITE_HOSTNAME;
    console.log(websiteUrlSSL);
}

if (mysqlHost) {
  database = {
    client: 'mysql',
    connection: {
       host     : mysqlHost,
       user     : mysqlUsername,
       password : mysqlPassword,
       database : mysqlDatabase,
       charset  : 'utf8'
    }
  }
  console.log(database);
}

config = {
    // ### Development **(default)**
    development: {
        // The url to use when providing links to the site, E.g. in RSS and email.
        url: websiteUrl,

        // Visit http://support.ghost.org/mail for instructions
         mail: {
             transport: 'SMTP',
             options: {
                 service: process.env.emailService,
                 auth: {
                     user: process.env.emailUsername, // mailgun username
                     pass: process.env.emailPassword  // mailgun password
                 }
             },
             from: process.env.emailFromAddress // 'from' address when sending emails
         },

        database: database ? database : {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost-dev.db')
            },
            debug: false
        },
        server: {
            // Host to be passed to node's `net.Server#listen()`
            host: '127.0.0.1',
            // Port to be passed to node's `net.Server#listen()`, for iisnode set this to `process.env.PORT`
            port: process.env.PORT
        },
        paths: {
            contentPath: path.join(__dirname, '/content/')
        },
        forceAdminSSL: false
    },

    // ### Production
    // When running Ghost in the wild, use the production environment
    // Configure your URL and mail settings here
    production: {
        url: websiteUrl,
        urlSSL: websiteUrlSSL,

        // Visit http://support.ghost.org/mail for instructions
        mail: {
         transport: 'SMTP',
         options: {
             service: process.env.emailService,
             auth: {
                 user: process.env.emailUsername, // mailgun username
                 pass: process.env.emailPassword  // mailgun password
             }
         },
         from: process.env.emailFromAddress // 'from' address when sending emails
        },
        database: database ? database : {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost.db')
            },
            debug: false
        },
        server: {
            // Host to be passed to node's `net.Server#listen()`
            host: '127.0.0.1',
            // Port to be passed to node's `net.Server#listen()`, for iisnode set this to `process.env.PORT`
            port: process.env.PORT
        },
        forceAdminSSL: true
    },

    // **Developers only need to edit below here**

    // ### Testing
    // Used when developing Ghost to run tests and check the health of Ghost
    // Uses a different port number
    testing: {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'sqlite3',
            connection: {
                filename: path.join(__dirname, '/content/data/ghost-test.db')
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false
    },

    // ### Testing MySQL
    // Used by Travis - Automated testing run through GitHub
    'testing-mysql': {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'mysql',
            connection: {
                host     : '127.0.0.1',
                user     : 'root',
                password : '',
                database : 'ghost_testing',
                charset  : 'utf8'
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false
    },

    // ### Testing pg
    // Used by Travis - Automated testing run through GitHub
    'testing-pg': {
        url: 'http://127.0.0.1:2369',
        database: {
            client: 'pg',
            connection: {
                host     : '127.0.0.1',
                user     : 'postgres',
                password : '',
                database : 'ghost_testing',
                charset  : 'utf8'
            }
        },
        server: {
            host: '127.0.0.1',
            port: '2369'
        },
        logging: false
    }
};

// Export config
module.exports = config;
