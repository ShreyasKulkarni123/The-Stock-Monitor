function isBusinessDay(date) {
    // if weekday then return 1
    return date.getDay() % 6 !== 0;
}

function findLastBusinessDay() {
    let currentDate = new Date();
    while (!isBusinessDay(currentDate)) {
        currentDate.setDate(currentDate.getDate() - 1);
    }
    return currentDate;
}