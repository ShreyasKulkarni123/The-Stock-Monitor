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
const yahooFinance = require('yahoo-finance2').default; // To make HTTP requests from our server. We'll learn more about it in Part C.

yahooFinance.search('AAPL', {}).then((result) => {
  console.log(result);
});

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
// <!-- Section 4 : API Routes -->
// *****************************************************

// TODO - Include your API routes here

//API default welcome test
app.get('/welcome', (req, res) => {
  res.status(200),
    res.json({ message: 'Welcome!', status: 'success' })
});

//API to load login page
app.get('/', async (req, res) => {
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
  // TODO: Insert username and hashed password into the 'users' table
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    await db.none('INSERT INTO users(username, password) VALUES($1, $2)', [req.body.username, hash]);
    res.redirect('/login');
  }
  catch (error) {
    console.error('Registration error:', error);
    res.redirect('/register');
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', req.body.username);
    if (user && await bcrypt.compare(req.body.password, user.password)) {
      //save user details in session like in lab 7
      req.session.user = { username: user.username };
      req.session.save();
      res.redirect('/discover');
    }
    else {
      res.render('pages/login', { message: "Incorrect username or password", error: true });
    }
  }
  catch (error) {
    console.error('Login error:', error);
    res.render('pages/login', { message: "ERROR", error: true });
  }
});

// Search
app.get('/search', (req, res) => {
  yahooFinance.search(req.query.symbol, {}).then((result) => {
    console.log(result);
  });
});


// app.get('/discover', auth, (req, res) => 
//     {
//       // console.log('inside discover redirect');


//       // // Authentication Required
//       // app.use(auth);

//       axios({
//         url: `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/2023-01-09?adjusted=true&apiKey=m7NOXY6BgOpLGGuT6prmQBoNInrLHVKJ`,
//         method: 'GET',
//         dataType: 'json',
//         headers: {
//           'Accept-Encoding': 'application/json',
//         },
//         params: {
//           apikey: process.env.API_KEY,
//           keyword: 'Red Rocks Amphitheatre', //you can choose any artist/event here
//           size: undefined // you can choose the number of events you would like to return
//         },
//       })
//         .then(results => {
//           // console.log('after axios then');

//           console.log(results.data._embedded.events[0].images); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
//         })
//         .catch(error => {
//           // Handle errors
//           // console.log('after axios catch');
//           res.render('pages/discover', 
//             { events: [], message: 'API Call failed' });
//         });
//     });
// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
