// Makes a url for a specific ticker for the about page
function makeAboutTickerURL(ticker)
{
  return ticker_url = 'https://api.polygon.io/v3/reference/tickers/' + ticker + '?apiKey=' + process.env.API_KEY;
}
function makeAggTickerURL(ticker, multiplier, timespan, from, to)
{
  return ticker_url = 'https://api.polygon.io/v2/aggs/ticker/'+ ticker + '/range/' + multiplier + '/' + timespan + '/' + from +'/' + to + '?adjusted=true&sort=desc&limit=50000&apiKey=' + process.env.API_KEY;
}

module.exports = {
    makeAboutTickerURL,
    makeAggTickerURL
};