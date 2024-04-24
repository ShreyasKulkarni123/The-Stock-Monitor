function isBusinessDay(date) {
    // if weekday then return 1
    return date.getDay() % 6 !== 0;
}

function findLastBusinessDay() {
    let currentDate = new Date();
    if (!isBusinessDay(currentDate)) {
        // If the current date is not a business day, move back until a business day is found
        while (!isBusinessDay(currentDate)) {
            currentDate.setDate(currentDate.getDate() - 1);
        }
    }
    // Move back one more day to get the last business day
    currentDate.setDate(currentDate.getDate() - 1);
    return currentDate;
}



function getHomeURL() {
    // Find the previous business day and put it into the correct format
    let prev_business_day = findLastBusinessDay();
    console.log(prev_business_day);
    prev_business_day = prev_business_day.toISOString().split('T')[0];
    
    // Return the formatted URL
    const home_url = 'https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/' + prev_business_day + '?adjusted=true&include_otc=false&apiKey=' + process.env.API_KEY;
    return home_url;
}

function getNewsURL() {
    // Find the ending date for news articles
    let date_of_news_articles_being_pull_until = new Date();
    date_of_news_articles_being_pull_until.setDate(date_of_news_articles_being_pull_until.getDate() - 5);
    date_of_news_articles_being_pull_until = date_of_news_articles_being_pull_until.toISOString().split('T')[0];
    
    // Set number of articles to get from URL
    const num_of_articles = 100;

    // Return the formatted URL
    const news_url = 'https://api.polygon.io/v2/reference/news?published_utc.gte=' + date_of_news_articles_being_pull_until + '&order=desc&limit=' + num_of_articles + '&sort=published_utc&apiKey=' + process.env.API_KEY;
    return news_url;
}


module.exports={
    findLastBusinessDay,
    getHomeURL,
    getNewsURL
}