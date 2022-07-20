const axios = require('axios')
const EventID = require('../models/eventIDs')
const TeamID = require('../models/teamIDs')
const LeagueID = require('../models/leagueIDs')
const PerformanceLog = require('../models/performanceLogs')
var summaryGreens = []
var greenRatio = 0.95

var leagueFilter = 12351533

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

var marketsRunnersDisplays = [
  { marketNameBF: 'Match Odds', runners: [], marketNameIddaa: 'Maç Sonucu', oddNames: ['1', '0', '2'], displayName: ['1', '0', '2'] },
  { marketNameBF: 'Over/Under 0.5 Goals', runners: ['Under 0.5 Goals', 'Over 0.5 Goals'], marketNameIddaa: 'Altı/Üstü 0,5', oddNames: ['Alt', 'Üst'], displayName: ['U 0.5', 'O 0.5'] },
  { marketNameBF: 'Over/Under 1.5 Goals', runners: ['Under 1.5 Goals', 'Over 1.5 Goals'], marketNameIddaa: 'Altı/Üstü 1,5', oddNames: ['Alt', 'Üst'], displayName: ['U 1.5', 'O 1.5'] },
  { marketNameBF: 'Over/Under 2.5 Goals', runners: ['Under 2.5 Goals', 'Over 2.5 Goals'], marketNameIddaa: 'Altı/Üstü 2,5', oddNames: ['Alt', 'Üst'], displayName: ['U 2.5', 'O 2.5'] },
  { marketNameBF: 'Over/Under 3.5 Goals', runners: ['Under 3.5 Goals', 'Over 3.5 Goals'], marketNameIddaa: 'Altı/Üstü 3,5', oddNames: ['Alt', 'Üst'], displayName: ['U 3.5', 'O 3.5'] },
  { marketNameBF: 'Over/Under 4.5 Goals', runners: ['Under 4.5 Goals', 'Over 4.5 Goals'], marketNameIddaa: 'Altı/Üstü 4,5', oddNames: ['Alt', 'Üst'], displayName: ['U 4.5', 'O 4.5'] },
  { marketNameBF: 'First Half Goals 0.5', runners: ['Under 0.5 Goals', 'Over 0.5 Goals'], marketNameIddaa: 'İlk Yarı Altı/Üstü 0,5', oddNames: ['Alt', 'Üst'], displayName: ['HT U 0.5', 'HT O 0.5'] },
  { marketNameBF: 'First Half Goals 1.5', runners: ['Under 1.5 Goals', 'Over 1.5 Goals'], marketNameIddaa: 'İlk Yarı Altı/Üstü 1,5', oddNames: ['Alt', 'Üst'], displayName: ['HT U 1.5', 'HT O 1.5'] },
  { marketNameBF: 'First Half Goals 2.5', runners: ['Under 2.5 Goals', 'Over 2.5 Goals'], marketNameIddaa: 'İlk Yarı Altı/Üstü 2,5', oddNames: ['Alt', 'Üst'], displayName: ['HT U 2.5', 'HT O 2.5'] },
  { marketNameBF: 'Both teams to Score?', runners: ['Yes', 'No'], marketNameIddaa: 'Karşılıklı Gol', oddNames: ['Var', 'Yok'], displayName: ['BSY', 'BSN'] },
  { marketNameBF: 'Correct Score', runners: ['3 - 3'], marketNameIddaa: 'Maç Skoru', oddNames: ['3:3'], displayName: ['3:3'] }
]

async function deleteFromMongoDB(q) {
  await EventID.deleteOne({ iddaaID: q.iddaaID })
  return q.iddaaID
}

// Scrape Iddaa
async function scrapeIddaa() {
  var startTime = new Date().getTime()
  await EventID.deleteMany({ date: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
  var leagues = await LeagueID.find()
  var teams = await TeamID.find()
  const savedMatches = await EventID.find()
  var newTime = new Date().getTime()
  var leaguesTeamsFromMongoDB = (newTime - startTime) / 1000
  console.log("Leagues/teams loaded: ", (newTime - startTime) / 1000, " sec")
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
            playingTeamsIddaa.forEach(playingTeamIddaa => {
              var teamDoc = teams.find(team => team.iddaaName === playingTeamIddaa)
              if (typeof teamDoc == 'undefined') {
                if (unknownTeams.indexOf(playingTeamIddaa) == -1) {
                  unknownTeams.push(playingTeamIddaa)
                }
              }
            })
            if (leagueFilter == leagueID || leagueFilter == -1) {
              var savedMatch = savedMatches.find(savedMatch => savedMatch.iddaaID === eventResponse.eid)
              var new_event = {
                league: eventResponse.cn,
                leagueId: leagueID,
                playingTeams: eventResponse.en,
                eventID: eventResponse.eid,
                date: eventResponse.e,
                mbs: eventResponse.mb,
                link: '',
                isLive: isLive
              }
              if (typeof savedMatch == 'undefined') {
                if (mentionedLeagues.indexOf(new_event.leagueId) == -1) {
                  mentionedLeagues.push(new_event.leagueId)
                }
              } else {
                savedMatch.date = new_event.date
                savedMatch.save()
                new_event.eventID = savedMatch.iddaaID
                new_event.link = savedMatch.link
                new_event.betfairEventID = savedMatch.betfairID
              }
              IddaaEvents.push(new_event)
            }
          })
        })
      })
      .catch(err => console.log(err))
  }
  console.log("Iddaa events loaded: ", (new Date().getTime() - newTime) / 1000, " sec")
  console.log("Iddaa events count: ", IddaaEvents.length)
  var iddaaNewTime = new Date().getTime()
  var iddaaTime = (iddaaNewTime - newTime) / 1000

  unknownLeagues.forEach(unknownLeague => {
    const newLeague = new LeagueID({
      iddaaName: unknownLeague
    })
    newLeague.save()
  })

  unknownTeams.forEach(unknownTeam => {
    const newTeam = new TeamID({
      iddaaName: unknownTeam
    })
    newTeam.save()
  })

  var unknownNewTime = new Date().getTime()
  console.log("Unknown leagues/teams processed: ", (unknownNewTime - iddaaNewTime) / 1000, " sec")
  var newStartTime = new Date().getTime()
  var betfairTime = []
  var leagueSize
  // Get all Betfair maket data
  for (mentionedLeague of mentionedLeagues) {
    leagueSize = 0
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
              leagueSize = leagueSize + 1
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
              } else {
              }
            }
          }
        })
      })
      .catch(err => console.log(err))
    var oneNewStartTime = new Date().getTime()
    var performanceRecord =
    {
      league: mentionedLeague,
      leagueSize: leagueSize,
      spentTime: (oneNewStartTime - newStartTime) / 1000
    }
    console.log("performanceRecord: ", performanceRecord)
    betfairTime.push(performanceRecord)
    newStartTime = oneNewStartTime
  }
  const data = IddaaEvents

  console.log("Betfair data loaded: ", (new Date().getTime() - startTime) / 1000, " sec")
  var totalLoadTime = (new Date().getTime() - startTime) / 1000

  const newPerformanceLog = new PerformanceLog({
    totalLoadTime: totalLoadTime,
    leaguesTeamsFromMongoDB: leaguesTeamsFromMongoDB,
    iddaa: iddaaTime,
    iddaaCount: data.length,
    betfair: betfairTime
  })
  newPerformanceLog.save()

  return data
}

// Scrape API
const scrapeAPI = async (q) => {
  if (q.bf != '') {
    var allOdds = []
    var nLive = 1
    var liveId
    var getURL
    var playingTeamsIddaa = ""
    var isOver = false
    if (q.isLive == 'true') { nLive = 2 }
    getURL = 'https://sportprogram.iddaa.com/SportProgram/market/' + nLive + '/1/' + q.id
    await axios
      .get(
        getURL,
        headersIddaa)
      .then(allOddsForEvent => {
        if (allOddsForEvent.data.data.event != null) {
          liveId = allOddsForEvent.data.data.event.bid
          var allMarkets = allOddsForEvent.data.data.event.m
          playingTeamsIddaa = allOddsForEvent.data.data.event.en
          marketsRunnersDisplays.forEach(market => {
            var marketIddaa = allMarkets.find(m => m.mn === market.marketNameIddaa)
            if (typeof marketIddaa != 'undefined') {
              var n = -1
              market.oddNames.forEach(oddName => {
                n = n + 1
                var odd = marketIddaa.o.find(o => o.ona === oddName)
                if (typeof odd != 'undefined') {
                  var eventDate = null
                  EventID.findOne({iddaaID: q.id}).then((savedEvent) => {
                    if (typeof savedEvent != 'undefined') {
                      console.log("savedEvent found: ", savedEvent)
                      eventDate = savedEvent.date
                      var theodd = {
                        date: eventDate,
                        IddaaId: q.id,
                        playingTeamsIddaa: playingTeamsIddaa,
                        marketName: market.marketNameIddaa,
                        oddName: odd.ona,
                        displayName: market.displayName[n],
                        odd: odd.odd
                      }
                      console.log("theodd.date: ", theodd.date)
                      allOdds.push(theodd)
                    }
                  }).catch((err) => {
                    console.log ("Error occured while looking for the event ", q.id, ": ", err)
                  })
                }
              })
            }
          })
        } else {
          isOver = true
        }
      })
      .catch(err => console.log(playingTeamsIddaa, err))
    if (isOver) {
      summaryGreens = summaryGreens.filter((summaryGreen) => {
        console.log("Removed green for: ", summaryGreen.oddId, " - game is over")
        return summaryGreen.eventId != q.id
      })
      return { combined_odds: '', message: 'The game is over' }
    }
    var matchTime = ""
    var matchResult = ""
    if (q.isLive == 'true') {
      getURL = 'https://lmt.fn.sportradar.com/common/tr/Etc:UTC/gismo/match_timelinedelta/' + liveId
      await axios
        .get(
          getURL,
          headersIddaa)
        .then(matchSituation => {
          var matchData = matchSituation.data.doc[0].data
          try {
            var thisResult = matchData.match.result
            var thoseTeams = matchData.match.teams
            playingTeamsIddaa = thoseTeams.home.name + ' - ' + thoseTeams.away.name
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
          } catch {
            console.log("Error in matchData: ", err)
          }
        })
        .catch(err => console.log(playingTeamsIddaa, err))
    }
    try {
      var marketIDsURL = 'https://ero.betfair.com/www/sports/exchange/readonly/v1/byevent?eventIds=' + q.bf + '&types=EVENT,MARKET_DESCRIPTION'
      marketIDsData = await axios.get(
        marketIDsURL,
        headersBetfair
      )
      if (marketIDsData.data.eventTypes.length > 0) {
        var eventName = marketIDsData.data.eventTypes[0].eventNodes[0].event.eventName
        const playingTeams = eventName.split(" v ")
        var marketNodes = marketIDsData.data.eventTypes[0].eventNodes[0].marketNodes
        var marketIDs = []
        marketsRunnersDisplays.forEach(market => {
          var marketName = market.marketNameBF
          var marketNode = marketNodes.find(node => node.description.marketName === marketName)
          if (typeof marketNode != 'undefined') {
            var new_market = {
              marketName: marketName,
              marketID: marketNode.marketId
            }
            marketIDs.push(new_market)
          }
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
          //console.log(marketPriceURL)
          var marketNodes = marketPriceData.data.eventTypes[0].eventNodes[0].marketNodes
          var moreRunners = []
          moreRunners.push(playingTeams[0])
          moreRunners.push('The Draw')
          moreRunners.push(playingTeams[1])
          marketsRunnersDisplays[0].runners = moreRunners
          marketIDs.forEach(marketID => {
            var marketNode = marketNodes.find(node => node.marketId === marketID.marketID)
            var market = marketsRunnersDisplays.find(market => market.marketNameBF === marketID.marketName)
            if (typeof marketNode != 'undefined') {
              var n = -1
              market.runners.forEach(runnerName => {
                n = n + 1
                var runner = marketNode.runners.find(runner => runner.description.runnerName === runnerName)
                if (typeof runner != 'undefined') {
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
                      displayName: market.displayName[n],
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
            }
          })
          var combined_odds = []
          //console.log("allOdds: ", allOdds)
          //console.log("bfOdds: ", bfOdds)
          bfOdds.forEach(bfOdd => {
            var iddaaOdd = allOdds.find(iddaaOdd => iddaaOdd.displayName === bfOdd.displayName)
            if (typeof iddaaOdd != 'undefined') {
              var combined_record = {
                eventDate: iddaaOdd.date,
                eventId: iddaaOdd.IddaaId,
                oddId: iddaaOdd.IddaaId.toString() + iddaaOdd.displayName,
                playingTeams: eventName,
                playingTeamsIddaa: iddaaOdd.playingTeamsIddaa,
                displayName: iddaaOdd.displayName,
                iddaaOdd: iddaaOdd.odd,
                betfairBack: bfOdd.back,
                betfairLay: bfOdd.lay,
                betfairAverage: Math.floor(1000 * ((bfOdd.back + bfOdd.lay) / 2)) / 1000,
                ratio: Math.floor(1000 * (iddaaOdd.odd / ((bfOdd.back + bfOdd.lay) / 2))) / 1000,
                isValid: bfOdd.isValid
              }
              //console.log("eventDate: ", combined_record.eventDate)
              if (combined_record.iddaaOdd == 1) {
                combined_record.iddaaOdd = '-'
                combined_record.ratio = '-'
                combined_record.isValid = false
              }
              combined_odds.push(combined_record)
              // Updating or removing the record for the Summary section
              var thisGreenIndex = summaryGreens.findIndex((summaryGreen) => {
                return summaryGreen.oddId === combined_record.oddId
              })
              if (thisGreenIndex > -1) {
                if (combined_record.ratio > greenRatio && combined_record.isValid) {
                  console.log("Updated green for: ", combined_record.oddId)
                  summaryGreens[thisGreenIndex] = combined_record
                } else {
                  console.log("Removed green for: ", combined_record.oddId, " - no longer green")
                  summaryGreens.splice(thisGreenIndex, 1)
                }
              } else {
                if (combined_record.ratio > greenRatio && combined_record.isValid) {
                  console.log("Added green for: ", combined_record.oddId)
                  summaryGreens.push(combined_record)
                }
              }
            }
          })
          var summaryEvent = summaryGreens.filter((summaryGreen) => {
            return summaryGreen.eventId == q.id
          })
          summaryEvent.forEach(sEvent => {
            var greenOdd = combined_odds.find(odd => odd.oddId === sEvent.oddId)
            if (typeof greenOdd == 'undefined') {
              summaryGreens = summaryGreens.filter((summaryGreen) => {
                console.log("Removed green for: ", sEvent.oddId, " - no such odd")
                return summaryGreen.oddId != sEvent.oddId
              })
            }
          })
          //const savedEvents = await EventID.find()
          var bFound = false
          await EventID.findOne({iddaaID: q.id}).then((savedEvent) => {
            if (typeof savedEvent != 'undefined') {
              bFound = true
              if (q.bf != savedEvent.betfairID) {
                savedEvent.betfairID = q.bf
                savedEvent.link = "/api?id=" + q.id + "&bf=" + q.bf
                savedEvent.playingTeamsBF = eventName
                savedEvent.save().then((result) => {
                  //console.log("BetfairID is updated for match: ", q.id)
                }).catch((err) => {
                  console.log("BetfairID update failed: ", err)
                })
              }  
            }
            //return
            //}
            //})  
          }). catch((err) => {
            console.log ("Error occured while looking for the event ", q.id, ": ", err)
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
          //console.log("combined_odds: ", combined_odds.length)
          const scrapedData = { 
            isLive: q.isLive, 
            matchResult: matchResult, 
            matchTime: matchTime, 
            combined_odds: combined_odds, 
            message: ''
          }
          return scrapedData
        } catch (err) {
          console.log("Get marketIDsData error (L0): ", marketPriceURL)
          //console.log("Get marketIDsData error (L0): ", err)
          return { combined_odds: '', message: 'Unknown error' + q.id }
        }
      }
    } catch (err) {
      //console.log("Get marketIDsData error (L1): ", err)
      console.log("Get marketIDsData error (L1): ", marketIDsURL)
      return { combined_odds: '', message: 'Unknown error' + q.id }
    }
  } else {
    console.log("Empty q.id")
    return { combined_odds: '', message: '' }
  }
}

async function getSummary() {
  summaryGreens.sort((a, b) => a.date - b.date)
  //console.log(summaryGreens)
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
