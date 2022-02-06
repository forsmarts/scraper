const puppeteer = require('puppeteer')

const scrapeIddaa = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()
  await page.goto('https://www.iddaa.com/')
  await page.waitForSelector('a[data-comp-name="mainMenu-preEvents-button"]')
  await page.click('a[data-comp-name="mainMenu-preEvents-button"]')
  await page.waitForTimeout(8000)
  await page.click('div[data-comp-name="filterBox-king"]')
  await page.waitForSelector('div[data-comp-name="filterBox-king-item"]:nth-child(2)')
  await page.click('div[data-comp-name="filterBox-king-item"]:nth-child(2)')
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
  await browser.close()
  return data
}

const scrapeBetfair = async (q) => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()
  await page.goto(q.url)
  await page.waitForSelector('div.main-mv-runners-list-wrapper button span:nth-child(2n-1)')
  const odds1 = await page.$$eval('div.main-mv-runners-list-wrapper button span:nth-child(2n-1)', (x) => {
    return x.map(y => y.textContent)
  })
  await page.waitForSelector('div.mini-mv table tr td')
  const odds2 = await page.$$eval('div.mini-mv table tr td', (x) => {
    return x.map(y => y.textContent.split("\n")[0])
  })
  await browser.close()
  const scrapedData = { odds: odds1.concat(odds2), arg: q}
  return scrapedData
}

module.exports.scrapeIddaa = scrapeIddaa
module.exports.scrapeBetfair = scrapeBetfair
