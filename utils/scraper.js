const axios = require('axios')
const EventID = require('../models/eventIDs')
const TeamID = require('../models/teamIDs')
const LeagueID = require('../models/leagueIDs')
const displayNames = require('../models/displayNames')
//const teams = require('../models/teams')
//const leagues = require('../models/leagues')
var summaryGreens = []
var greenRatio = 0.95

var leagueFilter = 10932509

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

async function deleteFromMongoDB(q) {
  await EventID.deleteOne({ iddaaID: q.iddaaID })
  return q.iddaaID
}

// Scrape Iddaa
async function scrapeIddaa() {
  await EventID.deleteMany({ date: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
  var leagues = await LeagueID.find()
  var teams = await TeamID.find()
  var IddaaEvents = []
  var mentionedLeagues = []
  var unknownLeagues = []
  var unknownTeams = []
  // Get all Iddaa events
  var iddaaURLs = [
    'https://sportprogram.iddaa.com/SportProgram?ProgramType=2&SportId=1&MukList=4_4,4_34,4_23,4_14_2.5,4_131&kingBetType=2',
    'https://sportprogram.iddaa.com/SportProgram?ProgramType=1&SportId=1&MukList=1_1,2_88,2_100,2_101_2.5,2_89&KingBetType=2'
  ]
  var leagueID
  for (let i = 0; i < 2; i++) {
    await axios
      .get(
        iddaaURLs[i], headersIddaa
      )
      .then(res => {
        if (i == 0) {
          var allIddaaEvent = res.data.data.stm
          var isLive = true
        } else {
          var allIddaaEvent = res.data.data.spg
          var isLive = false
        }
        allIddaaEvent.forEach(liveEvent => {
          var eventResponses = liveEvent.eventGroup[0].eventResponse
          eventResponses.forEach(eventResponse => {
            var leagueDoc = leagues.find(league => league.iddaaName === eventResponse.cn)
            if (typeof leagueDoc != 'undefined') {
              if (typeof leagueDoc.betfairId != 'undefined') {
                leagueID = leagueDoc.betfairId
              } else {
                leagueID = 0
              }
            } else {
              leagueID = 0
              if (unknownLeagues.indexOf(eventResponse.cn) == -1) {
                unknownLeagues.push(eventResponse.cn)
              }
            }
            var playingTeamsIddaa = eventResponse.en.split(" - ")
            playingTeamsIddaa.forEach (playingTeamIddaa => {
              var teamDoc = teams.find(team => team.iddaaName === playingTeamIddaa)
              if (typeof teamDoc == 'undefined') {
                //console.log(playingTeamIddaa)
                if (unknownTeams.indexOf(playingTeamIddaa) == -1) {
                  unknownTeams.push(playingTeamIddaa)
                }
              }  
            })
            //if (leagueFilter == leagueID) {
            var new_event = {
              league: eventResponse.cn,
              leagueId: leagueID,
              playingTeams: eventResponse.en,
              eventID: eventResponse.eid,
              date: eventResponse.e,
              mbs: eventResponse.mb,
              link: '',
              bfurl: '',
              isLive: isLive
            }
            if (mentionedLeagues.indexOf(new_event.leagueId) == -1) {
              mentionedLeagues.push(new_event.leagueId)
            }
            IddaaEvents.push(new_event)
            //}
          })
        })
      })
      .catch(err => console.log(err))
  }

  //console.log(unknownLeagues)
  unknownLeagues.forEach(unknownLeague => {
    const newLeague = new LeagueID({
      iddaaName: unknownLeague
    })
    newLeague.save()
  })

  //console.log(unknownTeams)
  unknownTeams.forEach(unknownTeam => {
    const newTeam = new TeamID({
      iddaaName: unknownTeam
    })
    newTeam.save()
  })

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
        if (typeof savedMatch.date == 'undefined') {
          savedMatch.date = IddaaEvent.date
        }
        savedMatch.save()
      }
    })
  })

  // Get all Betfair maket data
  for (mentionedLeague of mentionedLeagues) {
    await axios
      .post(
        'https://scan-inbf.betfair.com/www/sports/navigation/facet/v1/search',
        { "filter": { "marketBettingTypes": ["ODDS"], "productTypes": ["EXCHANGE"], "marketTypeCodes": ["MATCH_ODDS"], "contentGroup": { "language": "en", "regionCode": "UK" }, "turnInPlayEnabled": true, "maxResults": 0, "selectBy": "FIRST_TO_START_AZ", "competitionIds": [mentionedLeague] }, "facets": [{ "type": "EVENT_TYPE", "skipValues": 0, "maxValues": 10, "next": { "type": "EVENT", "skipValues": 0, "maxValues": 50, "next": { "type": "MARKET", "maxValues": 1, "next": { "type": "COMPETITION", "maxValues": 1 } } } }], "currencyCode": "GBP", "locale": "en_GB" },
        headersBetfair
      )
      .then(res => {
        var leagueEvents = res.data.attachments.events
        IddaaEvents.forEach(IddaaEvent => {
          for (var key in leagueEvents) {
            if (leagueEvents[key].competitionId == IddaaEvent.leagueId) {
              var playingTeamsBF = leagueEvents[key].name.split(' v ')
              var team0 = teams.find(team => team.aliases.indexOf(playingTeamsBF[0]) > -1)
              var team1 = teams.find(team => team.aliases.indexOf(playingTeamsBF[1]) > -1)
              if (typeof team0 != 'undefined') {
                playingTeamsBF[0] = team0.iddaaName
              }
              if (typeof team1 != 'undefined') {
                playingTeamsBF[1] = team1.iddaaName
              }
              var playingTeamsIddaaStyle = playingTeamsBF[0] + ' - ' + playingTeamsBF[1]
              if (IddaaEvent.playingTeams == playingTeamsIddaaStyle || IddaaEvent.betfairEventID == leagueEvents[key].eventId) {
                IddaaEvent.betfairEventID = leagueEvents[key].eventId
                IddaaEvent.link = '/api?id=' + IddaaEvent.eventID + '&bf=' + leagueEvents[key].eventId
                var league = leagues.find(league => league.betfairID == IddaaEvent.leagueId)
                if (typeof league != 'undefined') {
                  IddaaEvent.bfurl = 'https://www.betfair.com/exchange/plus/en/football/' + league.betfairID + '/' + leagueEvents[key].name.replaceAll(" ", "-").toLowerCase() + '-betting-' + leagueEvents[key].eventId
                }
              } else {
              }
            }
          }
        })
      })
      .catch(err => console.log(err))
  }
  const data = IddaaEvents
  return data
}

// Scrape API
const scrapeAPI = async (q) => {
  if (q.bf != '') {
    var allOdds = []
    var nLive = 1
    var liveId
    var getURL
    var playingTeamsForError = ""
    var isOver = false
    if (q.isLive == 'true') { nLive = 2 }
    getURL = 'https://sportprogram.iddaa.com/SportProgram/market/' + nLive + '/1/' + q.id
    await axios
      .get(
        getURL,
        headersIddaa)
      .then(allOddsForEvent => {
        //console.log(getURL)
        if (allOddsForEvent.data.data.event != null) {
          liveId = allOddsForEvent.data.data.event.bid
          var allMarkets = allOddsForEvent.data.data.event.m
          playingTeamsForError = allOddsForEvent.data.data.event.en
          allMarkets.forEach(market => {
            marketNames.forEach(marketName => {
              if (market.mn == marketName.marketName) {
                market.o.forEach(odd => {
                  var n = -1
                  marketName.oddNames.forEach(oddName => {
                    n = n + 1
                    if (oddName == odd.ona) {
                      if (odd.odd > 1) {
                        allOdds.push({
                          IddaaId: q.id,
                          playingTeamsIddaa: playingTeamsForError,
                          marketName: marketName.marketName,
                          oddName: odd.ona,
                          displayName: marketName.displayName[n],
                          odd: odd.odd
                        })
                      }
                    }
                  })
                })
              }
            })
          })  
        } else {
          isOver = true          
        }
      })
      .catch(err => console.log(playingTeamsForError, err))
    if (isOver) {
      //console.log("The game is over")
      summaryGreens = summaryGreens.filter((summaryGreen) => {
        return summaryGreen.eventId != q.id
      })
      return { combined_odds: '', message: 'The game is over' }
    }
    var matchTime = ""
    var matchResult = ""
    if (q.isLive == 'true') {
      getURL = 'https://lmt.fn.sportradar.com/common/tr/Etc:UTC/gismo/match_timelinedelta/' + liveId
      //console.log(getURL)
      await axios
        .get(
          getURL,
          headersIddaa)
        .then(matchSituation => {
          var matchData = matchSituation.data.doc[0].data
          var thisResult = matchData.match.result
          var thoseTeams = matchData.match.teams
          playingTeamsForError = thoseTeams.home.name + ' - ' + thoseTeams.away.name
          matchResult = thisResult.home.toString() + ":" + thisResult.away.toString()
          var thisSituation = matchData.events.find((event) => {
            return event.type === "matchsituation"
          })
          if (typeof thisSituation != 'undefined') {
            var minute = thisSituation.time.toString() + "'"
            var injurytime = thisSituation.injurytime
            matchTime = minute.toString()
            if (injurytime > 0) {
              matchTime = matchTime + " + " + injurytime.toString() + "'"
            }  
          }
        })
        .catch(err => console.log(playingTeamsForError, err))
    }

    const runnerNames = ['Under 0.5 Goals', 'Over 0.5 Goals', 'Under 1.5 Goals', 'Over 1.5 Goals', 'Under 2.5 Goals', 'Over 2.5 Goals', 'Under 3.5 Goals', 'Over 3.5 Goals', 'Under 4.5 Goals', 'Over 4.5 Goals', 'Yes', 'No', '3 - 3']
    const marketNamesBF = ['Match Odds', 'Over/Under 0.5 Goals', 'Over/Under 1.5 Goals', 'Over/Under 2.5 Goals', 'Over/Under 3.5 Goals', 'Over/Under 4.5 Goals', 'Both teams to Score?', 'Correct Score']
    try {
      marketIDsData = await axios.get(
        'https://ero.betfair.com/www/sports/exchange/readonly/v1/byevent?eventIds=' + q.bf + '&types=MARKET_STATE,EVENT,MARKET_DESCRIPTION',
        headersBetfair
      )
      var eventName
      try {
        eventName = marketIDsData.data.eventTypes[0].eventNodes[0].event.eventName
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
                  var ratio = runner.exchange.availableToBack[0].price / runner.exchange.availableToLay[0].price
                  var thresholdRatio = 0.9
                  if (runnerName == '3 - 3') {
                    thresholdRatio = 0.75
                  }
                  var new_odds = {
                    odd: runnerName,
                    back: runner.exchange.availableToBack[0].price,
                    lay: runner.exchange.availableToLay[0].price,
                    displayName: displayNames.get(runnerName),
                    isValid: true
                  }
                  if (ratio <= thresholdRatio) {
                    new_odds.isValid = false
                  }
                  bfOdds.push(new_odds)
                } catch {
                  //console.log("Problem with: ", eventName, " - ", runnerName)
                }
              }
            })
            for (var key of moreRunners.keys()) {
              if (key === runner.description.runnerName) {
                try {
                  var ratio = runner.exchange.availableToBack[0].price / runner.exchange.availableToLay[0].price
                  var thresholdRatio = 0.9
                  var new_odds = {
                    odd: moreRunners.get(key),
                    back: runner.exchange.availableToBack[0].price,
                    lay: runner.exchange.availableToLay[0].price,
                    displayName: displayNames.get(moreRunners.get(key)),
                    isValid: true
                  }
                  if (ratio <= thresholdRatio) {
                    new_odds.isValid = false
                  }
                  bfOdds.push(new_odds)
                } catch {
                  //console.log("Problem with: ", eventName, " - ", moreRunners.get(key))
                }
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
              eventId: allOdds[iddaaIndex].IddaaId,
              oddId: allOdds[iddaaIndex].IddaaId.toString() + displayNames.get(key),
              playingTeams: eventName,
              playingTeamsIddaa: allOdds[iddaaIndex].playingTeamsIddaa,
              displayName: displayNames.get(key),
              iddaaOdd: allOdds[iddaaIndex].odd,
              betfairBack: bfOdds[bfIndex].back,
              betfairLay: bfOdds[bfIndex].lay,
              betfairAverage: Math.floor(1000 * ((bfOdds[bfIndex].back + bfOdds[bfIndex].lay) / 2)) / 1000,
              ratio: Math.floor(1000 * (allOdds[iddaaIndex].odd / ((bfOdds[bfIndex].back + bfOdds[bfIndex].lay) / 2))) / 1000,
              isValid: bfOdds[bfIndex].isValid
            }
            combined_odds.push(combined_record)
            // Updating or removing the record for the Summary section
            var thisGreenIndex = summaryGreens.findIndex((summaryGreen) => {
              return summaryGreen.oddId === combined_record.oddId
            })
            if (thisGreenIndex > -1) {
              if (combined_record.ratio > greenRatio && combined_record.isValid) {
                summaryGreens[thisGreenIndex] = combined_record
              } else {
                summaryGreens.splice(thisGreenIndex, 1)
              }
            } else {
              if (combined_record.ratio > greenRatio && combined_record.isValid) {
                summaryGreens.push(combined_record)
              }
            }
          }
        }
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
        const scrapedData = { isLive: q.isLive, matchResult: matchResult, matchTime: matchTime, combined_odds: combined_odds, message: '' }
        return scrapedData
      } catch (err) {
        console.log("Get marketIDsData error (L2): ", err)
      }
    } catch (err) { 
      console.log("Get marketIDsData error (L1):", err)
    }
  } else {
    return { combined_odds: '', message: ''  }
  }
}

async function getSummary() {
  return summaryGreens
}

async function getVersion() {
  return 0
}

module.exports.scrapeIddaa = scrapeIddaa
module.exports.scrapeAPI = scrapeAPI
module.exports.deleteFromMongoDB = deleteFromMongoDB
module.exports.getSummary = getSummary
module.exports.getVersion = getVersion
