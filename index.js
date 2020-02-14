const CronJob = require('cron').CronJob
const api = require('./api')
//

//
async function run() {
  const job = new CronJob('00 00 00 * * *', function() {
    console.log('cron run!')
    api.run(
      'https://www.copart.com/lotSearchResults/?searchCriteria=%7B%22query%22:%5B%22*%22%5D,%22filter%22:%7B%22VEHT%22:%5B%22vehicle_type_code:VEHTYPE_V%22%5D%7D,%22sort%22:%5B%22auction_date_type%20desc%22,%22auction_date_utc%20asc%22%5D,%22watchListOnly%22:false,%22searchName%22:%22%22,%22freeFormSearch%22:false%7D',
      '#serverSideDataTable tbody tr a[data-uname="lotsearchLotnumber"]',
      2
    )
  })

  job.start()
  // await api.orderedPageLoad(todayAuctionLinks)
}

run()
