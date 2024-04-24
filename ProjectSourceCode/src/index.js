// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const rest = require('@polygon.io/client-js');
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
const { markAsUntransferable } = require('worker_threads');
const { env } = require('process');
const moment = require('moment-timezone');


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

// database configuration
const ProdDBConfig = {
  host: process.env.host, // the database server
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
// <!-- Section 4 : Global Variables and functions
// *****************************************************

// Importing helper handlebars functions
const handlebarsHelpers = require('./resources/library/handlebarsHelpers'); // Import your custom Handlebars helpers

// Importing helper URL functions
const { makeAboutTickerURL, makeAggTickerURL } = require('./resources/library/URLHelpers');

// Importing helper date functions
const { findLastBusinessDay, getHomeURL, getNewsURL } = require('./resources/library/findLastBusinessDay');
const { read } = require('fs');

// Define Handlebars helper function to split array into chunks


let featured_stocks_global = [];

// *****************************************************
// <!-- Section 5 : API Routes -->
// *****************************************************

// TODO - Include your API routes here

// Middleware to pass scrolling_stocks to all templates
app.use((req, res, next) => {
  // Pass scrolling_stocks to all templates
  res.locals.scrolling_stocks = featured_stocks_global;
  next();
});

//API default welcome test
app.get('/welcome', (req, res) => {
  res.status(200),
    res.json({ message: 'Welcome!', status: 'success' })
});

//API to load login page
app.get('/', (req, res) => {
  res.redirect('/login'); //this will call the /anotherRoute route in the API
});

app.get('/register', (req, res) => {
  res.render('pages/register', {
    username: req.session.username
  }); //this will call the /anotherRoute route in the API
});

app.get('/login', (req, res) => {
  res.render('pages/login', {
    username: req.session.username
  }); //this will call the /anotherRoute route in the API
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

  db.one('SELECT * FROM users WHERE username=$1;', [username])
    .then(async (users) => {

      // check if password from request matches with password in DB
      const match = await bcrypt.compare(req.body.password, users.password);

      if (match) {

        //save user details in session like in lab 7
        req.session.username = username;

        // save the user id for easily finding which stocks in the watchlist DB are being watched by the user and also for adding stocks to their watchlist. For ease of access in order to query the DB with their user_id
        req.session.user_id = users.id;
        req.session.save();
        res.redirect('/home');
      }
      else {
        res.render('pages/login',
          {
            error: true, // want to put in message "Incorrect username or password."
            message: 'Incorrect username or password.',
            username: req.session.username
          });
      }
    })
    .catch(err => {
      res.render('pages/login',
        {
          error: true,
          message: 'Username not found.',
          username: req.session.username
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

app.get('/home', auth, async (req, res) => {

  // Authentication Required

  // using axios to call the api and Get the daily open, high, low, and close (OHLC) for the entire stocks/equities markets. For US market only at the moment.
  //this will provide the home page with all the info to populate it with everything it needs  
  try {
    // Get the user_id from the session in order to query the watchlist table in the DB
    const user_id = req.session.user_id;
    
    // Concurrently fetch watchlist and featured_stocks data (in parallel)
    // Query the watchlist table from the database to get the user's watchlist
    // Call the Polygon API to get featured stocks data and Extract featured stocks data from the API response
    const [watchlist, featured_stocks] = await Promise.all([
      db.manyOrNone('SELECT symbol FROM Watchlist WHERE user_id = $1', [user_id]),
      axios.get(getHomeURL()).then(response => response.data.results)
    ]);

    if (featured_stocks) {
      // Filter the featured stocks based on the symbols in the watchlist
      const watchlist_stocks = watchlist.map(watchlist_item => {
        return featured_stocks.find(stock => stock.T === watchlist_item.symbol);
      }).filter(Boolean); // Filter out undefined values

      featured_stocks_global = featured_stocks;

      const chunked_featured_stocks = [];
      for (let i = 0; i < (featured_stocks.length)-2; i += 3) {
        chunked_featured_stocks.push({
          stock_1: featured_stocks[i],
          stock_2: featured_stocks[i + 1],
          stock_3: featured_stocks[i + 2]
        });
      }

      // Render the home page with featured stocks and watchlist
      res.render('pages/home', {
        featured_stocks_triple: chunked_featured_stocks,
        watchlist_stocks,
        username: req.session.username
      });
    }
    else {
      console.error('Error fetching data:', error);
      // Render the home page with empty data and an error message
      res.render('pages/home', { 
        featured_stocks: [], 
        watchlist_stocks: [], 
        message: 'No data from Polygon API',
        username: req.session.username
      });
    }
  }
  catch (error) {
    console.error('Error fetching data:', error);
    // Render the home page with empty data and an error message
    res.render('pages/home', { 
      featured_stocks: [],
      watchlist_stocks: [],
      message: 'Failed to fetch data',
      username: req.session.username
    });
  }
});

//API to load news page
app.get('/news', auth, (req, res) => {

  // Authentication Required

  // using axios to call the api and Get the most recent news articles relating to a stock ticker symbol, including a summary of the article and a link to the original source.
  axios({
    
    url: getNewsURL(),
    method: 'GET',
    dataType: 'json',
  })
    .then(news_data => {
      res.render('pages/news', { 
        NewsArticle: news_data.data.results,
        username: req.session.username
      });
    })
    .catch(error => {
      // Handle errors
      console.log('after axios catch', error);
      res.render('pages/news', { 
        NewsArticle: [], 
        message: 'API Call failed',
        username: req.session.username
      });
    });
});

app.get('/about', auth, async (req, res) => {
  // Authentication Required
  try {
    //getting the ticker from the user that will be used to get all the information about it from the polygon API
    const ticker = req.session.ticker;

    //this will return the correct URL to plug into the API for the information about the ticker provided
    let ticker_url = makeAboutTickerURL(ticker)

    // using axios to call the api and Get details for a single ticker. This response will have detailed information about the ticker and the company behind it.
    const response = await axios.get(ticker_url);

    if (response.data && response.data.results) {

      if(req.session.in_watchlist)
      {
        // Extracting ticker_details from the response data
        const ticker_details = response.data.results;
        res.render('pages/about', {
          message: 'Ticker already in watchlist',
          ticker_details: ticker_details,
          username: req.session.username
        });
      }
      else
      {
          // Extracting ticker_details from the response data
        const ticker_details = response.data.results;
        res.render('pages/about', {
          message: 'Ticker added to watchlist',
          ticker_details: ticker_details,
          username: req.session.username
        });
      }
      
    }
    else {
      console.log('ticker given is invalid', error);
      res.render('pages/home', {
        message: 'ticker given is invalid',
        username: req.session.username
      });
    }

  }
  catch (error) {
    // Handle errors
    console.log('error: ', error);
    res.render('pages/home', {
      message: 'Ticker given is invalid',
      username: req.session.username
    });
  }
});

app.post('/add-to-watchlist-from-about', async (req, res) => {
  const userID = req.session.user_id;
  req.session.save();

  let watchlist_item_might_exist = await db.manyOrNone('SELECT * FROM watchlist WHERE symbol=($1)', [req.session.ticker]);

  if(!watchlist_item_might_exist)
  {
    db.none('INSERT INTO watchlist (user_id, symbol) VALUES ($1, $2);', [userID, req.session.ticker])
    .then(reload => {
      res.redirect('/about');
    })
    .catch(err => {
      res.redirect('/about');
    });
  }
  else
  {
    req.session.in_watchlist = true
    req.session.save();
    res.redirect('/about');
  }

  
});

app.post('/add-to-watchlist-from-home', (req, res) => {
  const ticker = req.body.ticker;
  const userID = req.session.user_id;
  const previous_page = req.body.current_page;
  db.none('INSERT INTO watchlist (user_id, symbol) VALUES ($1, $2);', [userID, ticker])
    .then(reload => {
      res.redirect(previous_page);
    })
    .catch(err => {
      res.redirect(previous_page);
    });
});

app.post('/remove-from-watchlist', (req, res) => {
  const ticker = req.body.ticker;
  const userID = req.session.user_id;
  const previous_page = req.body.current_page;
  db.none('DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2;', [userID, ticker])
    .then(() => {
      res.redirect(previous_page); // Redirects back to the previous page after successful deletion
    })
    .catch(err => {
      console.error('Error removing from watchlist:', err);
      res.redirect(previous_page); // Redirects back if there is an error during the deletion
    });
});

//API to load about page
app.post('/about', auth, async (req, res) => {
  // Authentication Required
  try{
    //getting the ticker from the user that will be used to get all the information about it from the polygon API
    req.session.ticker = req.body.ticker; 
    req.session.save();

    let ticker = req.session.ticker;

    //this will return the correct URL to plug into the API for the information about the ticker provided
    let ticker_url = makeAboutTickerURL(ticker)

    // using axios to call the api and Get details for a single ticker. This response will have detailed information about the ticker and the company behind it.
    const response = await axios.get(ticker_url);
    
    if(response.data && response.data.results) {
      // Extracting ticker_details from the response data
      const ticker_details = response.data.results;
      res.render('pages/about', { 
        ticker_details: ticker_details,
        username: req.session.username
      });
    }
    else {
      console.log('ticker given is invalid', error);
      res.render('pages/home', { 
        message: 'ticker given is invalid',
        username: req.session.username
      });
    }

  }
  catch(error) {
    // Handle errors
    console.log('error: ', error);
    res.render('pages/home', { 
      message: 'Ticker given is invalid',
      username: req.session.username
    });
  }
});

app.get('/logout', (req, res) => {
  if (req.session.username) {
    req.session.username = null;
    req.session.save();
    if (!req.session.username) {
      res.render('pages/logout', { 
        message: 'Logged out successfully!',
        username: req.session.username
      }); //this will call the /anotherRoute route in the API  
    }
    else {
      res.render('pages/logout', { 
        message: 'Logout NOT successful!!',
        username: req.session.username
      }); //this will call the /anotherRoute route in the API
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
