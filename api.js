const puppeteer = require('puppeteer')
const dotenv = require('dotenv')
const axios = require('axios')
const SEND_URL = ''

dotenv.config()

async function run(url, DOMPath, lastPage) {
  console.log('run!')

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Функция для входа в аккаунт
  await login(page)
  // После входа переходим на страницу каталоога, заданную ранее
  await page.goto(url, { waitUntil: 'networkidle2' })
  //Парсим
  await parse(DOMPath, browser, page, lastPage)
  // Закрытие браузера при завершении
  await browser.close()
}

async function login(page) {
  console.log('login!')
  await page.goto('https://www.copart.com/login/')

  console.log(await process.env.EMAIL, process.env.PASS)

  await page.waitForSelector('input#username')
  await page.type('input#username', process.env.EMAIL)
  await page.waitForSelector('input#password')
  await page.type('input#password', process.env.PASS)

  await Promise.all([
    page.keyboard.press('Enter'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
  ])
}

async function parse(DOMPath, browser, page, lastPage) {
  const currentPageNum = await page.evaluate(() => {
    return parseInt(
      document.querySelector('.pagination .paginate_button.active').innerText
    )
  })

  console.log('parse!', `page ${currentPageNum}`)

  const urls = await page.evaluate(path => {
    let links = []
    document.querySelectorAll(path).forEach(link => {
      links.push(link.href)
    })

    return links
  }, DOMPath)

  await orderedPageLoad(urls, browser)

  // Замыкание функции
  console.log('click to next page!')
  await Promise.all([
    page.click('.paginate_button.next a'),
    page.waitFor(1000),
    page.waitFor(
      () =>
        document.querySelector('#serverSideDataTable_processing').style
          .display === 'none'
    ),
  ])
  console.log('loaded next page!')
  if (currentPageNum < lastPage) {
    await parse(DOMPath, browser, page, lastPage)
  } else {
    return
  }
  //
}

async function orderedPageLoad(urls, browser) {
  console.log('ordered pages load!', urls)
  let page2

  for (let index = 0; index < urls.length; index++) {
    page2 = await browser.newPage()

    await parsePage(urls[index], page2)

    await page2.close()
  }
}

async function parsePage(url, page) {
  console.log(`parse ${url} run!`)

  await page.goto(url, { waitUntil: 'networkidle2' })

  await Promise.all([
    page.waitFor(() => !!document.querySelector('h1 .title')), // The promise resolves after navigation has finished
  ])

  let data = await page.evaluate(() => {
    // const images = []
    // document
    //   .querySelectorAll('.image-galleria_wrap .small-container.martop img')
    //   .forEach(img => {
    //     images.push(img.attributes[5].value)
    //   })

    function getDataFromTag(tag) {
      if (document.querySelector(tag)) {
        return document.querySelector(tag).innerText
      }
    }

    const carYear = document.querySelector('h1 .title').innerText.slice(0, 4)
    const carCompany = document
      .querySelector('h1 .title')
      .innerText.slice(5)
      .split(' ')[0]
    const carModel = document
      .querySelector('h1 .title')
      .innerText.slice(6 + carCompany.length)
    return {
      // img: images,
      company: carCompany,
      model: carModel,
      img: document.querySelector('.spZoomImg img').src,
      // car_status: getDataFromTag('[data-uname="lotdetailHighlights"]+span'),
      // damage: getDataFromTag('[data-uname="lotdetailPrimarydamagevalue"]'),
      color: getDataFromTag('[data-uname="lotdetailColorvalue"]'),
      year: carYear,
      fuel: getDataFromTag('[data-uname="lotdetailFuelvalue"]'),
      transmission: getDataFromTag(
        'div[ng-if="lotDetails.tmtp || lotDetails.htsmn==\'Y\'"] span'
      ),
      drive: getDataFromTag('[data-uname="DriverValue"]'),
      key: getDataFromTag('[data-uname="lotdetailKeyvalue"]'),
      auction_date: getDataFromTag(
        '[data-uname="lotdetailSaleinformationlastupdatedvalue"]'
      ),
      // document_type: getDataFromTag(
      //   '[data-uname="lotdetailTitledescriptionvalue"]'
      // ),
      // seller: getDataFromTag('[data-uname="lotdetailSellervalue"]'),
      mileage: getDataFromTag('[data-uname="lotdetailOdometervalue"]'),
      // sale_place: getDataFromTag(
      //   '[data-uname="lotdetailSaleinformationlocationvalue"]'
      // ),
      price: getDataFromTag('[data-uname="lotdetailEstimatedretailvalue"]'),
      vin: getDataFromTag('[data-uname="lotdetailVinvalue"]'),
      start_price: getDataFromTag('label[for="Starting Bid"]+span'),
    }
  })

  await axios
    .post(SEND_URL, data)
    .then(response => {
      console.log(data)
      console.log(response)
    })
    .catch(error => {
      console.error(error)
    })

  // console.log(data)
  return
}

module.exports = {
  run,
}
