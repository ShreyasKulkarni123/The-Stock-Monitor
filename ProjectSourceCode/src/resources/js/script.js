

console.log("ya");

// hack lol
ticker = document.getElementById('ticker').textContent.split(" ")[1];
console.log(`ticker = [${ticker}]`);



// const xValues = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
// const yValues = [7, 8, 8, 9, 9, 9, 10, 11, 14, 14, 15];

// function makeAggTickerURL(ticker, multiplier, timespan, from, to)
// {
//   return ticker_url = 'https://api.polygon.io/v2/aggs/ticker/'+ ticker + '/range/' + multiplier + '/' + timespan + '/' + from +'/' + to + '?adjusted=true&sort=asc&limit=50000&apiKey=' + process.env.API_KEY;
// }

fetch(`/graph-${ticker}`).then(res => {
    if (res.status != 200) {
        console.log(`status: ${res.status}`)
        return;
    }
    res.json().then(obj => {

        // y values
        let close_arr = [];
        // x values
        let times = [];
        let polygon = obj.res;
        let count = polygon.resultsCount;

        for (let i = count - 1; i >= 0; i--) {
            close_arr.push(polygon.results[i].c);

            let ms = polygon.results[i].t;
            let date = new Date(ms);
            times.push(date.toISOString().split('.')[0].replace('T', ' ').slice(0, -3))
            // times.push(ms);
        }

        if (obj.error) return;
        console.log(obj);

        new Chart("myChart", {
            type: "line",
            data: {
                labels: times,
                datasets: [{
                    label: `${ticker} value in USD`,
                    backgroundColor: "rgba(0,0,255,1.0)",
                    borderColor: "rgba(0,0,255,0.1)",
                    data: close_arr
                }]
            },
            options: {
                animation: false,
                scales: {
                    xAxes: {
                        display: true,
                        text: 'value',
                    },
                    y: {
                        display: true,
                        text: 'days'
                    }
                }
            }
            // options: {
            //     barThickness: 1,
            //     scales: {
            //         xAxes: [{
            //             stacked: true,
            //             ticks: {
            //                 fontColor: this.tickColor
            //             },
            //             gridLines: {
            //                 drawOnChartArea: false
            //             }
            //         }],
            //         yAxes: [{
            //             stacked: true,
            //             // ticks: {
            //             //     fontColor: this.tickColor,
            //             //     min: 0,
            //             //     max: 175,
            //             //     stepSize: 25
            //             // }
            //         }]
            //     },
            //     labels: ['Current data', 'Vs last week/month/year', 'Change'],
            //     name: ['Current data', 'Vs last week/month/year', 'Change'],
            //     legend: {
            //         display: true,
            //         legendText: ['Current', 'Vs last week/month/year', '% Change']
            //     },
            // }
        });
    });
});

