// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : Global Variables
// *****************************************************

// getting yesterdays date for calling information from the polygon API
// need yesterdays date in order to get the most recent information for the stocks 
let yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday = yesterday.toISOString().split('T')[0];

// *****************************************************
// <!-- Section 5 : API Routes -->
// *****************************************************

// TODO - Include your API routes here

//API default welcome test
app.get('/welcome', (req, res) => {
  res.status(200),
    res.json({ message: 'Welcome!', status: 'success' })
});

//API to load login page
app.get('/', (req, res) => {
  res.render('pages/home'); //this will call the /anotherRoute route in the API
});

app.get('/register', (req, res) => {
  res.render('pages/register'); //this will call the /anotherRoute route in the API
});

app.get('/login', (req, res) => {
  res.render('pages/login'); //this will call the /anotherRoute route in the API
});

// Register
app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);

  // To-DO: Insert username and hashed password into the 'users' table
  db.none('INSERT INTO users (username, password) VALUES ($1, $2);', [req.body.username, hash])
    .then(() => {
      res.redirect('/login');
    })
    .catch(err => {
      res.redirect('/register');
    });
});

app.post('/login', async (req, res) => {

  let username = req.body.username;

  db.one('SELECT password FROM users WHERE username=$1;', [username])
    .then(async (users) => {

      // check if password from request matches with password in DB
      const match = await bcrypt.compare(req.body.password, users.password);

      if (match) {
        // console.log('inside match before discover redirect');
        //save user details in session like in lab 7
        req.session.username = username;
        req.session.save();
        res.redirect('/home')
        // console.log('inside match AFTER discover redirect');
      }
      else {
        res.render('pages/login',
          {
            error: true, // want to put in message "Incorrect username or password."
            message: 'Incorrect username or password.',
          });
      }
    })
    .catch(err => {
      res.render('pages/login',
        {
          error: true,
          message: 'Username not found.',
        });
    });
});

// Authentication Middleware.
const auth = (req, res, next) => {
  // console.log('authenticated');
  if (!req.session.username) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

app.get('/home', auth, (req, res) => {
  // console.log('inside discover redirect');


  // // Authentication Required
  // app.use(auth);

  axios({
    url: `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/2024-04-10?adjusted=true&include_otc=false&apiKey=m7NOXY6BgOpLGGuT6prmQBoNInrLHVKJ`,
    method: 'GET',
    dataType: 'json',
    // headers: {
    //   Authorization: 'Bearer m7NOXY6BgOpLGGuT6prmQBoNInrLHVKJ',
    // },
    // params: {
    //   date: yesterday,
    //   adjusted: false,
    //   include_otc: false,
    // },
  })
    .then(results => {
      console.log('after axios then');

      console.log(results.data); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
      // res.render('pages/discover', { events: results.data._embedded.events });
    })
    .catch(error => {
      // Handle errors
      console.log('after axios catch', error);
      res.render('pages/home',
        { stocks: [], message: 'API Call failed' });
    });
});

app.get('/logout', (req, res) => {
  if (req.session.username) {
    req.session.username = null;
    req.session.save();
    if (!req.session.username) {
      res.render('pages/logout', { message: 'Logged out successfully!' }); //this will call the /anotherRoute route in the API  
    }
    else {
      res.render('pages/logout', { message: 'Logout NOT successful!!' }); //this will call the /anotherRoute route in the API
    }
  }
  else {
    res.redirect('/login')
  }
});

// *****************************************************
// <!-- Section 6 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');