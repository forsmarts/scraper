const axios = require('axios')
const EventID = require('../models/eventIDs')
const displayNames = require('../models/displayNames')
const teams = require('../models/teams')
const leagues = require('../models/leagues')

var headersIddaa = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
    'referer': 'https://www.iddaa.com//'
  }
}
var headersBetfair = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
    'content-type': 'application/json',
    'referer': 'https://www.betfair.com/'
  }
}

const marketNames = [
  { marketName: 'Maç Sonucu', oddNames: ['1', '0', '2'], displayName: ['1', '0', '2'] },
  { marketName: 'Altı/Üstü 0,5', oddNames: ['Alt', 'Üst'], displayName: ['U 0.5', 'O 0.5'] },
  { marketName: 'Altı/Üstü 1,5', oddNames: ['Alt', 'Üst'], displayName: ['U 1.5', 'O 1.5'] },
  { marketName: 'Altı/Üstü 2,5', oddNames: ['Alt', 'Üst'], displayName: ['U 2.5', 'O 2.5'] },
  { marketName: 'Altı/Üstü 3,5', oddNames: ['Alt', 'Üst'], displayName: ['U 3.5', 'O 3.5'] },
  { marketName: 'Altı/Üstü 4,5', oddNames: ['Alt', 'Üst'], displayName: ['U 4.5', 'O 4.5'] },
  { marketName: 'Karşılıklı Gol', oddNames: ['Var', 'Yok'], displayName: ['BSY', 'BSN'] },
  { marketName: 'Maç Skoru', oddNames: ['3:3'], displayName: ['3:3'] }
]

async function deleteFromMongoDB (q) {
  await EventID.deleteOne({ iddaaID: q.iddaaID })
  return q.iddaaID
}

async function dateFilter (q) {
  console.log("dateFilter")
  console.log(q)
  return 0
}

var IddaaEvents = []
var mentionedLeagues = []
var mentionedDates = []

async function loadFilters() {
  await EventID.deleteMany({ date: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
  IddaaEvents = []
  mentionedLeagues = []
  // Get all Iddaa events
  // Live events
  await axios
    .get(
      'https://sportprogram.iddaa.com/SportProgram?ProgramType=2&SportId=1&MukList=4_4,4_34,4_23,4_14_2.5,4_131&kingBetType=2',
      headersIddaa
    )
    .then(res => {
      var allLiveIddaaEventSTM = res.data.data.stm
      allLiveIddaaEventSTM.forEach(liveEventSTM => {
        var eventResponses = liveEventSTM.eventGroup[0].eventResponse
        eventResponses.forEach(eventResponse => {
          var new_event = {
            league: eventResponse.cn,
            leagueId: leagues.get(eventResponse.cn),
            playingTeams: eventResponse.en,
            eventID: eventResponse.eid,
            date: eventResponse.e,
            link: '',
            bfurl: '',
            isLive: true
          }
          var foundLeague = mentionedLeagues.find(x => x.leagueId === new_event.leagueId)
          if (typeof foundLeague == 'undefined') {
            var newLeague = {
              leagueId: new_event.leagueId,
              leagueName: leagues.get(new_event.leagueId),
              count: 1
            }
            mentionedLeagues.push(newLeague)
            if (typeof new_event.leagueId == 'undefined') {
              console.log(new_event.playingTeams)
            }
          } else {
            var foundLeagueIndex = mentionedLeagues.findIndex(x => x.leagueId === new_event.leagueId)
            mentionedLeagues[foundLeagueIndex].count++
          }
          IddaaEvents.push(new_event)
        })
      })
    })
    .catch(err => console.log(err))
  // Future events
  await axios
    .get(
      'https://sportprogram.iddaa.com/SportProgram?ProgramType=1&SportId=1&MukList=1_1,2_88,2_100,2_101_2.5,2_89&KingBetType=2',
      headersIddaa
    )
    .then(res => {
      var allIddaaEventSPG = res.data.data.spg
      allIddaaEventSPG.forEach(eventSPG => {
        var eventResponses = eventSPG.eventGroup[0].eventResponse
        eventResponses.forEach(eventResponse => {
          var new_event = {
            league: eventResponse.cn,
            leagueId: leagues.get(eventResponse.cn),
            playingTeams: eventResponse.en,
            eventID: eventResponse.eid,
            date: eventResponse.e,
            link: '',
            bfurl: '',
            isLive: false
          }
          var foundLeague = mentionedLeagues.find(x => x.leagueId === new_event.leagueId)
          if (typeof foundLeague == 'undefined') {
            var newLeague = {
              leagueId: new_event.leagueId,
              leagueName: leagues.get(new_event.leagueId),
              count: 1
            }
            mentionedLeagues.push(newLeague)
            if (typeof new_event.leagueId == 'undefined') {
              console.log(new_event.playingTeams)
            }
          } else {
            var foundLeagueIndex = mentionedLeagues.findIndex(x => x.leagueId === new_event.leagueId)
            mentionedLeagues[foundLeagueIndex].count++
            if (typeof new_event.leagueId == 'undefined') {
              console.log(new_event.playingTeams)
            }
          }
          if (mentionedDates.indexOf(new_event.date.split("T")[0]) == -1) {
             mentionedDates.push(new_event.date.split("T")[0])
          }
          IddaaEvents.push(new_event)
        })
      })
    })
    .catch(err => console.log(err))

  await EventID.deleteMany({ date: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
  // Adjusting records in MongoDB
  const savedMatches = await EventID.find()
  let bFound = false
  IddaaEvents.forEach(IddaaEvent => {
    bFound = false
    savedMatches.forEach(savedMatch => {
      if (IddaaEvent.eventID == savedMatch.iddaaID) {
        bFound = true
        if (IddaaEvent.betfairEventID != savedMatch.betfairID) {
          IddaaEvent.betfairEventID = savedMatch.betfairID
          IddaaEvent.link = savedMatch.link
        }
        savedMatch.league = IddaaEvent.leagueId
        if (typeof savedMatch.date == 'undefined') {
          savedMatch.date = IddaaEvent.date
        }
        savedMatch.save()
      }
    })
  })
  return {mentionedLeagues: mentionedLeagues, mentionedDates: mentionedDates}
}

// Scrape Iddaa
const scrapeIddaa = async (q) => {
  if (q.leagueId === 'undefined') {
    var bettingEvents = IddaaEvents.filter(x => typeof x.leagueId == q.leagueId)
  } else {
    var bettingEvents = IddaaEvents.filter(x => x.leagueId === parseInt(q.leagueId))
    var mentionedLeague = q.leagueId
    await axios
      .post(
        'https://scan-inbf.betfair.com/www/sports/navigation/facet/v1/search',
        { "filter": { "marketBettingTypes": ["ODDS"], "productTypes": ["EXCHANGE"], "marketTypeCodes": ["MATCH_ODDS"], "contentGroup": { "language": "en", "regionCode": "UK" }, "turnInPlayEnabled": true, "maxResults": 0, "selectBy": "FIRST_TO_START_AZ", "competitionIds": [mentionedLeague] }, "facets": [{ "type": "EVENT_TYPE", "skipValues": 0, "maxValues": 10, "next": { "type": "EVENT", "skipValues": 0, "maxValues": 50, "next": { "type": "MARKET", "maxValues": 1, "next": { "type": "COMPETITION", "maxValues": 1 } } } }], "currencyCode": "GBP", "locale": "en_GB" },
        headersBetfair
      )
      .then(res => {
        var leagueEvents = res.data.attachments.events
        bettingEvents.forEach(bettingEvent => {
          for (var key in leagueEvents) {
            if (leagueEvents[key].competitionId == bettingEvent.leagueId) {
              var playingTeamsBF = leagueEvents[key].name.split(' v ')
              if (typeof teams.get(playingTeamsBF[0]) != 'undefined') {
                playingTeamsBF[0] = teams.get(playingTeamsBF[0])
              }
              if (typeof teams.get(playingTeamsBF[1]) != 'undefined') {
                playingTeamsBF[1] = teams.get(playingTeamsBF[1])
              }
              if (bettingEvent.playingTeams == playingTeamsBF[0] + ' - ' + playingTeamsBF[1] || bettingEvent.betfairEventID == leagueEvents[key].eventId) {
                bettingEvent.betfairEventID = leagueEvents[key].eventId
                bettingEvent.link = '/api?id=' + bettingEvent.eventID + '&bf=' + leagueEvents[key].eventId
                if (typeof leagues.get(leagueEvents[key].competitionId) != 'undefined') {
                  bettingEvent.bfurl = 'https://www.betfair.com/exchange/plus/en/football/' + leagues.get(leagueEvents[key].competitionId) + '/' + leagueEvents[key].name.replaceAll(" ", "-").toLowerCase() + '-betting-' + leagueEvents[key].eventId
                }
              } else {
              }
            }
          }
        })
      })
      .catch(err => console.log(err))
  }
  const data = bettingEvents
  return data
}

// Scrape API
const scrapeAPI = async (q) => {
  if (q.bf != '') {
    var allOdds = []
    var nLive = 1
    if (q.isLive == 'true') { nLive = 2 }
    var getURL = 'https://sportprogram.iddaa.com/SportProgram/market/' + nLive + '/1/' + q.id
    await axios
      .get(
        getURL,
        headersIddaa)
      .then(allOddsForEvent => {
        var allMarkets = allOddsForEvent.data.data.event.m
        allMarkets.forEach(market => {
          marketNames.forEach(marketName => {
            if (market.mn == marketName.marketName) {
              market.o.forEach(odd => {
                var n = -1
                marketName.oddNames.forEach(oddName => {
                  n = n + 1
                  if (oddName == odd.ona) {
                    allOdds.push({
                      marketName: marketName.marketName,
                      oddName: odd.ona,
                      displayName: marketName.displayName[n],
                      odd: odd.odd
                    })
                  }
                })
              })
            }
          })
        })
      })
      .catch(err => console.log(err))

    const runnerNames = ['Under 0.5 Goals', 'Over 0.5 Goals', 'Under 1.5 Goals', 'Over 1.5 Goals', 'Under 2.5 Goals', 'Over 2.5 Goals', 'Under 3.5 Goals', 'Over 3.5 Goals', 'Under 4.5 Goals', 'Over 4.5 Goals', 'Yes', 'No', '3 - 3']
    const marketNamesBF = ['Match Odds', 'Over/Under 0.5 Goals', 'Over/Under 1.5 Goals', 'Over/Under 2.5 Goals', 'Over/Under 3.5 Goals', 'Over/Under 4.5 Goals', 'Both teams to Score?', 'Correct Score']
    try {
      marketIDsData = await axios.get(
        'https://ero.betfair.com/www/sports/exchange/readonly/v1/byevent?eventIds=' + q.bf + '&types=MARKET_STATE,EVENT,MARKET_DESCRIPTION',
        headersBetfair
      )
    } catch (err) {
      console.log("Get marketIDsData error")
    }
    var eventName = marketIDsData.data.eventTypes[0].eventNodes[0].event.eventName
    const playingTeams = eventName.split(" v ")
    var marketNodes = marketIDsData.data.eventTypes[0].eventNodes[0].marketNodes
    var marketIDs = []
    marketNamesBF.forEach(marketName => {
      marketNodes.forEach(marketNode => {
        if (marketNode.description.marketName == marketName) {
          var new_market = {
            marketName: marketName,
            marketID: marketNode.marketId
          }
          marketIDs.push(new_market)
        }
      })
    })
    var MarketIDs = ""
    marketIDs.forEach(marketID => {
      MarketIDs = MarketIDs + marketID.marketID + ","
    })
    MarketIDs = MarketIDs.slice(0, -1)
    var bfOdds = []
    var marketPriceData
    try {
      marketPriceURL = 'https://ero.betfair.com/www/sports/exchange/readonly/v1/bymarket?alt=json&marketIds=' + MarketIDs + '&types=EVENT,RUNNER_EXCHANGE_PRICES_BEST,RUNNER_DESCRIPTION'
      marketPriceData = await axios.get(
        marketPriceURL,
        headersBetfair
      )
    } catch (err) {
      console.log(err)
    }
    var marketNodes = marketPriceData.data.eventTypes[0].eventNodes[0].marketNodes
    var moreRunners = new Map
    moreRunners.set(playingTeams[0], 'Result 1')
    moreRunners.set('The Draw', 'Result 0')
    moreRunners.set(playingTeams[1], 'Result 2')

    marketNodes.forEach(marketNode => {
      marketNode.runners.forEach(runner => {
        runnerNames.forEach(runnerName => {
          if (runnerName == runner.description.runnerName) {
            try {
              var new_odds = {
                odd: runnerName,
                back: runner.exchange.availableToBack[0].price,
                lay: runner.exchange.availableToLay[0].price,
                displayName: displayNames.get(runnerName)
              }
              bfOdds.push(new_odds)
            } catch {
              console.log("Problem with: ", eventName, " - ", runnerName)
              console.log("Error: ", runner.exchange)
            }
          }
        })
        for (var key of moreRunners.keys()) {
          if (key === runner.description.runnerName) {
            new_odds = {
              odd: moreRunners.get(key),
              back: runner.exchange.availableToBack[0].price,
              lay: runner.exchange.availableToLay[0].price,
              displayName: displayNames.get(moreRunners.get(key))
            }
            bfOdds.push(new_odds)
          }
        }
      })
    })
    var combined_odds = []
    for (var key of displayNames.keys()) {
      var nPresented = 0
      var iddaaIndex = 0
      var bfIndex = 0
      var n = -1
      allOdds.forEach(iddaaOdd => {
        n = n + 1
        if (displayNames.get(key) == iddaaOdd.displayName) {
          nPresented = nPresented + 1
          iddaaIndex = n
        }
      })
      n = -1
      bfOdds.forEach(bfOdd => {
        n = n + 1
        if (key == bfOdd.odd) {
          nPresented = nPresented + 1
          bfIndex = n
        }
      })
      if (nPresented == 2) {
        var combined_record = {
          isLive: q.isLive,
          displayName: displayNames.get(key),
          iddaaOdd: allOdds[iddaaIndex].odd,
          betfairBack: bfOdds[bfIndex].back,
          betfairLay: bfOdds[bfIndex].lay,
          betfairAverage: Math.floor(1000 * ((bfOdds[bfIndex].back + bfOdds[bfIndex].lay) / 2)) / 1000,
          ratio: Math.floor(1000 * (allOdds[iddaaIndex].odd / ((bfOdds[bfIndex].back + bfOdds[bfIndex].lay) / 2))) / 1000
        }
        combined_odds.push(combined_record)
      }
    }
    const scrapedData = { combined_odds: combined_odds }
    const savedEvents = await EventID.find()
    let bFound = false
    savedEvents.forEach(savedEvent => {
      if (q.id == savedEvent.iddaaID) {
        bFound = true
        if (q.bf != savedEvent.betfairID) {
          savedEvent.betfairID = q.bf
          savedEvent.link = "/api?id=" + q.id + "&bf=" + q.bf
          savedEvent.playingTeamsBF = eventName
          savedEvent.save()
            .then((result) => {
              //console.log("BetfairID is updated for match: ", q.id)
            })
            .catch((err) => {
              console.log("BetfairID update failed: ", err)
            })
        }
        return
      }
    })
    if (!bFound) {
      const m = new EventID({
        iddaaID: q.id,
        betfairID: q.bf,
        link: "/api?id=" + q.id + "&bf=" + q.bf
      })
      m.save()
        .then((result) => {
          //console.log("New record created for match: ", q.id)
        })
        .catch((err) => {
          console.log("New record creation failed: ", err)
        })
    }
    return scrapedData
  } else {
    return {combined_odds: ''}
  }
}

module.exports.scrapeIddaa = scrapeIddaa
module.exports.scrapeAPI = scrapeAPI
module.exports.deleteFromMongoDB = deleteFromMongoDB
module.exports.loadFilters = loadFilters
module.exports.dateFilter = dateFilter
