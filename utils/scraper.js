const puppeteer = require('puppeteer')
const axios = require('axios')
const Match = require('../models/matches')

const scrapeIddaa = async () => {
  const savedMatches = await Match.find()
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
    return x.map(y => y.textContent.split("2Kral")[0].split("Kral")[0])
  })
  const league = await page.$$eval('div[data-event-id] div[type]', (x) => {
    return x.map(y => y.textContent.split("\n")[0])
  })
  const url = []
  teams.forEach( match => {
    url.push("")
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
  const data = {teams: teams, league: league, url: url, savedMatches: savedMatches, res1: res1, res0: res0, res2: res2, u25: u25, o25: o25}
  let n=-1
  let bFound=false
  teams.forEach (match => {
    n=n+1
    bFound=false
    savedMatches.forEach(savedMatch => {
      if (match==savedMatch.match) {
        bFound=true
        if (savedMatch.url != "") {
          url[n]=savedMatch.url
        }
        return
      }
    })
    if (!bFound) {
      const m = new Match({
        match: teams[n],
        league: league[n]
      })
      m.save()
        .then((result) => {
          //console.log("Saved")
        })
        .catch((err) => {
          console.log(err)
        })  
    }
  })
  await browser.close()
  return data
}

const scrapeBetfair = async (q) => {
  const browser = await puppeteer.launch({
    //headless: false,
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()
  await page.goto(q.url)
  await page.waitForSelector('div.main-mv-runners-list-wrapper button span:nth-child(2n-1)')
  try {
    const theMatch = await Match.updateOne(
      {match: q.m},
      {$set: {url: q.url}}
    )
  } catch (err) {
    console.log(err.message)
  }  
  const odds_results = await page.$$eval('div.main-mv-runners-list-wrapper button span:nth-child(2n-1)', (x) => {
    return x.map(y => y.textContent)
  })
  const links = await page.$$eval('div.navigation-container li a', (x) => {
    const href = x.map(y => y.getAttribute("href"))
    const text = x.map(y => y.textContent)
    return {href: href, text: text}
  })

  // Getting additional odds through API

  //TODO: more additional odds, now adding more text won't work
  const additional_odds = ['Under 2.5 Goals', 'Over 2.5 Goals']
  const additionally_searched_text = ["2.5 Goals"]
  var MarketIDs = ""
  var n=-1
  for (const text of links.text) {
    n=n+1
    if (text.indexOf(additionally_searched_text[0]) >= 0) {
      MarketIDs = MarketIDs + links.href[n].split("/")[2]
      break
    }
  }

  var headers = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
      'referer': 'https://www.betfair.com/'  
    }
  };

  var odds_goals = []
  var marketPriceData

  try {
    marketPriceData = await axios.get(
      'https://ero.betfair.com/www/sports/exchange/readonly/v1/bymarket?alt=json&marketIds=' + MarketIDs + '&types=EVENT,RUNNER_EXCHANGE_PRICES_BEST,RUNNER_DESCRIPTION',
      headers
      )
  } catch (err) {
    console.log(err)
  }
  
  var marketPrices = marketPriceData.data.eventTypes[0].eventNodes[0].marketNodes[0].runners

  additional_odds.forEach (additional_odd => {
    marketPrices.forEach( runner =>{
      if (additional_odd == runner.description.runnerName) {
        new_odds = {
          odd: additional_odd,
          back: runner.exchange.availableToBack[0].price,
          lay: runner.exchange.availableToLay[0].price
        }
        odds_goals.push(new_odds)
      }
    })
  
  })
  odds_goals.forEach (odd => {
    odds_results.push(odd.odd)
    odds_results.push(odd.back.toString())
    odds_results.push(odd.lay.toString())
  })
  //await page.waitForSelector('div.mini-mv table tr td')
  //const odds2 = await page.$$eval('div.mini-mv table tr td', (x) => {
  //  return x.map(y => y.textContent.split("\n")[0])
  //})
  await browser.close()
  //const scrapedData = { odds: odds1.concat(odds2), arg: q}
  console.log(odds_results)
  const scrapedData = { odds_results: odds_results, arg: q}
  return scrapedData
}

module.exports.scrapeIddaa = scrapeIddaa
module.exports.scrapeBetfair = scrapeBetfair
