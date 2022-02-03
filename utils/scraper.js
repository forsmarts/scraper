const puppeteer = require('puppeteer')

const scrapeIddaa = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()
  //await page.goto("C:\\Programming\\NodeJS\\iddaa_sm.xml", {waitUntil: 'networkidle2'})
  await page.goto('https://www.iddaa.com/')
  await page.waitForTimeout(5000)
  //await page.screenshot({path: "iddaa0.png"})
  await page.click('a[data-comp-name="mainMenu-preEvents-button"]')
  await page.waitForTimeout(8000)
  //await page.screenshot({path: "iddaa1.png"})
  await page.click('div[data-comp-name="filterBox-king"]')
  await page.waitForTimeout(1000)
  //await page.screenshot({path: "iddaa2.png"})
  await page.click('div[data-comp-name="filterBox-king-item"]:nth-child(2)')
  await page.waitForTimeout(5000)
  //await page.screenshot({path: "iddaa3.png"})
  const teams = await page.$$eval('div[data-event-id] a[data-comp-name]', (x) => {
    return x.map(y => y.textContent)
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
  console.log(data)
  await browser.close()
  return data
}

const scrapeYoutube = async () => {
  //const browser = await puppeteer.launch()
  //const page = await browser.newPage()
  //await page.goto(
  //  'https://www.youtube.com/results?search_query=headless+browser'
  //)

  //const scrapedData = await page.evaluate(() =>
  //  Array.from(document.querySelectorAll('.ytd-video-renderer #video-title'))
  //    .map(link => ({
  //      title: link.getAttribute('title'),
  //      link: link.getAttribute('href')
  //    }))
  //    .slice(0, 10)
  //)


  //await browser.close()
  //return scrapedData
  return {title: "zhiop", link: "iop"}
}

module.exports.scrapeIddaa = scrapeIddaa
module.exports.scrapeYoutube = scrapeYoutube
