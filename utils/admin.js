const axios = require('axios')
const TeamID = require('../models/teamIDs')
const LeagueID = require('../models/leagueIDs')

async function getAdmin() {
    var leagues = await LeagueID.find()
    var teams = await TeamID.find()
    data = {teams: teams, leagues: leagues}
    return data
}

const mapLeague = async (q) => {
    var message = ''
    var mapData = []
    if (q.rm != 'true') {
        try {
            mapData.push(q.bfn)
            mapData.push(q.bfid)
            await LeagueID.updateOne({iddaaName: q.iddaa}, {$set:{betfairName: q.bfn, betfairId: q.bfid}})    
        } catch {
            message = "Something went wrong in mapLeague function"
        }
    } else {
        try {
            mapData.push('')
            mapData.push(0)
            await LeagueID.updateOne({iddaaName: q.iddaa}, {$set:{betfairName: '', betfairId: 0}})   
        } catch {
            message = "Something went wrong in mapLeague function"
        }
    }
    var data = {iddaaName: q.iddaa, nLeagues: q.nLeague, mapData: mapData, message: message} 
    return data   
}

const mapTeam = async (q) => {
    var message = ''
    var aliases
    if (q.rm != 'true') {
        try {
            var team = await TeamID.findOne({iddaaName: q.iddaa})
            aliases = team.aliases
            //console.log(aliases)
            aliases.push(q.alias)
            await TeamID.updateOne({iddaaName: q.iddaa}, {$set:{aliases: aliases}})    
        } catch {
            message = "Something went wrong in mapTeam function"
        }    
    } else {
        try {
            var team = await TeamID.findOne({iddaaName: q.iddaa})
            aliases = team.aliases
            //console.log("Before: ", aliases)
            //aliases.push(q.alias)
            aliases.splice(q.nAlias,1)
            //console.log("After: ", aliases)
            await TeamID.updateOne({iddaaName: q.iddaa}, {$set:{aliases: aliases}})            
        } catch {
            message = "Something went wrong in mapTeam function"
        }    
    }
    var data = {iddaaName: q.iddaa, nTeam: q.nTeam, aliases: aliases, message: message}
    return data
}
// async function getTeams() {
// 	await LeagueID.deleteMany({betfairId:{ $exists: false }})
// 	return 0
// }
// async function getTeams() {
// 	var aTeams = []
// 	for (const league of leagues.keys()) {
// 		if (typeof leagues.get(league) === "number") {
// 			//console.log("Iddaa: ", teams.get(team), " Betfair: ", team)
// 			//var aliases = []
// 			//aliases.push(team)
// 			teamId = {
// 				iddaaName: league,
// 				betfairName: leagues.get(leagues.get(league)),
// 				betfairId: leagues.get(league)
// 			}
// 			const leagueId = new LeagueID({
// 				iddaaName: league,
// 				betfairName: leagues.get(leagues.get(league)),
// 				betfairId: leagues.get(league)
// 			})
// 			leagueId.save()
// 				.then((result) => {
// 					//console.log("New record created for match: ", q.id)
// 				})
// 				.catch((err) => {
// 					console.log("New record creation failed: ", err)
// 				})
// 			aTeams.push(teamId)
// 		}
//   }
// 	return aTeams
// }
module.exports.getAdmin = getAdmin
module.exports.mapLeague = mapLeague
module.exports.mapTeam = mapTeam