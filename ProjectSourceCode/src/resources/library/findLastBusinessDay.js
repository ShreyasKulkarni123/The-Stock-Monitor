function isBusinessDay(date) {
    // Check if the date is Saturday (6) or Sunday (0)
    return date.getDay() % 6 !== 0;
}

function findLastBusinessDay() {
    let currentDate = new Date();
    
    // Keep subtracting days until we find a business day
    while (!isBusinessDay(currentDate)) {
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return currentDate;
}

console.log(getMostRecentBusinessDay());
