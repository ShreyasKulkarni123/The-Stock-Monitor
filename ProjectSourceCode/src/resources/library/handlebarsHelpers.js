const Handlebars = require('handlebars');
const moment = require('moment-timezone'); // Import moment-timezone if you're using it




/////////////////    HELPER FUNCTIONS START    ////////////////////////////////////////////

// Handlebars helper to truncate description text for news descriptions
Handlebars.registerHelper('truncate', function(text, length) {
    if (text.length > length) {
      return text.substring(0, length);
    } 
    else {
        return text;
    }
});

// Handlebars helper to convert UTC to MST
Handlebars.registerHelper('convertToMST', function(utcDate) {
    // Parse UTC date string using moment.js
    const utcMoment = moment.utc(utcDate);
    // Convert to MST timezone
    const mstMoment = utcMoment.tz('America/Denver');
    // Format the date in MST
    return mstMoment.format('YYYY-MM-DD HH:mm:ss');
});

Handlebars.registerHelper('chunk', function(array, size, options) {
    var results = [];
    for (var i = 0; i < array.length; i += size) {
        results.push(options.fn(array.slice(i, i + size)));
    }
    return results.join('');
  });

/////////////////    HELPER FUNCTIONS END   ////////////////////////////////////////////





module.exports = Handlebars;