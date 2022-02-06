const puppeteer = require('puppeteer')

const scrapeIddaa = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()
  await page.goto('https://www.iddaa.com/')
  //await page.goto("c:\\Users\\37529\\Documents\\GitHub\\scraper\\iddaa.html")
  //await page.goto("iddaa.html")
  //await page.waitForTimeout(5000)
  //await page.screenshot({path: "iddaa0.png"})
  await page.waitForSelector('a[data-comp-name="mainMenu-preEvents-button"]')
  await page.click('a[data-comp-name="mainMenu-preEvents-button"]')
  await page.waitForTimeout(8000)
  //await page.screenshot({path: "iddaa1.png"})
  //await page.waitForSelector('div[data-comp-name="filterBox-king"]', 'visible')
  //await page.screenshot({path: "iddaa1.png"})
  await page.click('div[data-comp-name="filterBox-king"]')
  //await page.waitForTimeout(1000)
  //await page.screenshot({path: "iddaa2.png"})
  await page.waitForSelector('div[data-comp-name="filterBox-king-item"]:nth-child(2)')
  await page.click('div[data-comp-name="filterBox-king-item"]:nth-child(2)')
  //await page.waitForTimeout(5000)
  //await page.screenshot({path: "iddaa3.png"})
  await page.waitForSelector('div[data-event-id] a[data-comp-name]')
  const teams = await page.$$eval('div[data-event-id] a[data-comp-name]', (x) => {
    return x.map(y => y.textContent.split("\n")[0])
  })
  const res1 = await page.$$eval('div[data-event-id] button:nth-child(20n-14)', (x) => {
    return x.map(y => y.textContent.split("\n")[0])
  })
  const res0 = await page.$$eval('div[data-event-id] button:nth-child(20n-13)', (x) => {
    return x.map(y => y.textContent.split("\n")[0])
  })
  const res2 = await page.$$eval('div[data-event-id] button:nth-child(20n-12)', (x) => {
    return x.map(y => y.textContent.split("\n")[0])
  })
  const u25 = await page.$$eval('div[data-event-id] button:nth-child(20n-4)', (x) => {
      return x.map(y => y.textContent.split("\n")[0])
  })
  const o25 = await page.$$eval('div[data-event-id] button:nth-child(20n-3)', (x) => {
      return x.map(y => y.textContent.split("\n")[0])
  })
  const data = {teams: teams, res1: res1, res0: res0, res2: res2, u25: u25, o25: o25}
  //console.log(data)
  await browser.close()
  return data
}

const scrapeBetfair = async (q) => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()
  //await page.goto("https://www.betfair.com/exchange/plus/en/football/portuguese-primeira-liga/sporting-lisbon-v-famalicao-betting-31197266")
  await page.goto(q.url)
  //await page.waitForTimeout(8000)
  await page.waitForSelector('div.main-mv-runners-list-wrapper button span:nth-child(2n-1)')
  //await page.screenshot({path: "screen1.png"})
  //await page.goto("c:\\Users\\37529\\Documents\\GitHub\\scraper\\0205-sporting-famalicao.html")
  const odds1 = await page.$$eval('div.main-mv-runners-list-wrapper button span:nth-child(2n-1)', (x) => {
    return x.map(y => y.textContent)
  })
  await page.waitForSelector('div.mini-mv table tr td')
  const odds2 = await page.$$eval('div.mini-mv table tr td', (x) => {
    return x.map(y => y.textContent.split("\n")[0])
  })
  //const oddsother = await page.$$eval('#main-wrapper > div > div.scrollable-panes-height-taker > div > ui-view > ui-view > div > div > div.bf-col-xxl-17-24.bf-col-xl-16-24.bf-col-lg-16-24.bf-col-md-15-24.bf-col-sm-14-24.bf-col-14-24.center-column.bfMarketSettingsSpace.bf-module-loading.nested-scrollable-pane-parent > div.scrollable-panes-height-taker.height-taker-helper > div > div:nth-child(2) > div > div > bf-other-markets > div > div > div > bf-tabs > section > div:nth-child(2) > div > div > div > div.column-right > bf-mini-market-container:nth-child(1) > bf-mini-marketview > div > div > bf-marketview-runners-list > div > div > div > table > tbody > tr:nth-child(1) > td.bet-buttons.back-cell.last-back-cell > button > div > span.bet-button-price', (x) => {
  //  return x.map(y => y)
  //}) 
  
  await browser.close()
  const scrapedData = { odds: odds1.concat(odds2), arg: q}
  //console.log(scrapedData)
  return scrapedData
  //return {match: "match", link: "link"}
}

module.exports.scrapeIddaa = scrapeIddaa
module.exports.scrapeBetfair = scrapeBetfair
