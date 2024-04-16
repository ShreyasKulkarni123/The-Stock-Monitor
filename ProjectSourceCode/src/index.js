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
// <!-- Section 4 : Global Variables and functions
// *****************************************************

// getting 2 days ago date for calling information from the polygon API
// need 2 days ago date in order to get the most recent information for the stocks. 
// using yesterdays can result in errors due to the API not allowing ticker information for the past 24 hours 
let date_2_days_ago = new Date();
date_2_days_ago.setDate(date_2_days_ago.getDate() - 3);
// this makes it so that there is no time for the date and there is only the date (this is for formating for the API)
date_2_days_ago = date_2_days_ago.toISOString().split('T')[0];

// used for getting the past news articles up to the date being used.
// will pull the most recent news and then pull news articles for days prior up to and including the date on the variable
let date_of_news_articles_being_pull_until = new Date();
date_of_news_articles_being_pull_until.setDate(date_of_news_articles_being_pull_until.getDate() - 5);
// this makes it so that there is no time for the date and there is only the date (this is for formating for the API)
date_of_news_articles_being_pull_until = date_of_news_articles_being_pull_until.toISOString().split('T')[0];

//changing the num_of_articles will change the number of artcles that the News page API sends back
const num_of_articles = 100;

const home_url = 'https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/' + date_2_days_ago + '?adjusted=true&include_otc=false&apiKey=' + process.env.API_KEY;

// this is the url to be sent through the get API for the news page.
// changing the 'num_of_articles' will change the number of artcles that the API sends back
// changing the 'date_of_news_articles_being_pull_until' will change the date that the news articles are pulled up to (will pull the most recent articles and all the articles back up to and including the date of 'date_of_news_articles_being_pull_until')
// note that the 'num_of_articles' will determine the number of pages pulled overall. If the number of pages exceeds the date for being pull until then the rest of the pages that would return will not. Likewise if there IS enough pages to reach the end of the the date until, it will not pull more pages to reach the end of the limit number. 
const news_url = 'https://api.polygon.io/v2/reference/news?published_utc.gte=' + date_of_news_articles_being_pull_until + '&order=desc&limit=' + num_of_articles + '&sort=published_utc&apiKey=' + process.env.API_KEY;

// used to Query the watchlist table from the database to get the user's watchlist. Needs to be a global variable in order for it to be accessed by multiple APIs and functions
let watchlist = [];

// function used in conjunction with filter() in order to find all the stocks given the entire ticker list that are in the users watchlist
async function filterWatchlist(featured_stocks) {
  const filtered_watchlist_stocks = [];

  // Iterate over each stock in the featured_stocks array
  for (let i = 0; i < featured_stocks.length; i++) {
    const stock_symbol = featured_stocks[i].T; // Get the symbol of the current stock

    // Check if the symbol is in the watchlist
    const is_in_watchlist = watchlist.some(item => item.symbol === stock_symbol);

    if (is_in_watchlist) {
      // If the symbol is in the watchlist, add the stock to the filtered array
      filtered_watchlist_stocks.push(featured_stocks[i]);
    }
  }

  return filtered_watchlist_stocks;
}
// makeTickerURL()
// {

// }

// *****************************************************
// <!-- Section 5 : API Routes -->
// *****************************************************


// authentication middleware -- redirects to login page for pages that include it
const auth = (req, res, next) => {
  if (!req.session.username) {
    return res.redirect('/login');
  }
  next();
};

//API default welcome test
app.get('/welcome', auth, (req, res) => {
  res.status(200),
    res.json({ message: 'Welcome!', status: 'success' })
});

//API to load login page
app.get('/', auth, (req, res) => {
  res.redirect('/home'); //this will call the /anotherRoute route in the API
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

  db.one('SELECT * FROM users WHERE username=$1;', [username])
    .then(async (users) => {

      // check if password from request matches with password in DB
      const match = await bcrypt.compare(req.body.password, users.password);

      if (match) {
        // console.log('inside match before discover redirect');
        //save user details in session like in lab 7
        req.session.username = username;
        
        // save the user id for easily finding which stocks in the watchlist DB are being watched by the user and also for adding stocks to their watchlist. For ease of access in order to query the DB with their user_id
        req.session.user_id = users.id;
        req.session.save();
        res.redirect('/home');
        // console.log('inside match AFTER discover redirect');
      }
      else {
        res.render('pages/login',
          {
            username: req.session.username,
            error: true, // want to put in message "Incorrect username or password."
            message: 'Incorrect username or password.',
          });
      }
    })
    .catch(err => {
      res.render('pages/login',
        {
          username: req.session.username,
          error: true,
          message: 'Username not found.',
        });
    });
});


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
      axios.get(home_url).then(response => response.data.results)
    ]);

    // Filter the featured stocks based on the symbols in the watchlist
    const watchlist_stocks = watchlist.map(watchlist_item => {
      return featured_stocks.find(stock => stock.T === watchlist_item.symbol);
    }).filter(Boolean); // Filter out undefined values
    
    // Render the home page with featured stocks and watchlist
    res.render('pages/home', { 
      username: req.session.username,
      featured_stocks, 
      watchlist_stocks
    });
  } 
  catch (error) {
    console.error('Error fetching data:', error);
    // Render the home page with empty data and an error message
    res.render('pages/home', { 
      username: req.session.username,
      featured_stocks: [],
      watchlist_stocks: [],
      message: 'Failed to fetch data'
    });
  }
});

//API to load news page
app.get('/news', auth, (req, res) => {

  // Authentication Required

  // using axios to call the api and Get the most recent news articles relating to a stock ticker symbol, including a summary of the article and a link to the original source.
  axios({
    
    url: news_url,
    method: 'GET',
    dataType: 'json',
  })
    .then(results => {
      console.log(results.data); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
    
      res.render('pages/news', { 
        username: req.session.username,
        NewsArticle: results.data.results
      });
    })
    .catch(error => {
      // Handle errors
      console.log('after axios catch', error);
      res.render('pages/news', { 
        username: req.session.username,
        NewsArticle: [],
        message: 'API Call failed'
      });
    });
});

app.get('/logout', (req, res) => {
  if (req.session.username) {
    req.session.username = null;
    req.session.save();
    if (!req.session.username) {
      res.render('pages/logout', { //this will call the /anotherRoute route in the API  
        username: req.session.username,
        message: 'Logged out successfully!'
      }); 
    }
    else {
      res.render('pages/logout', { 
        username: req.session.username,
        message: 'Logout NOT successful!!'
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
