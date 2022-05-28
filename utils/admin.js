const axios = require('axios')
const TeamID = require('../models/teamIDs')
const LeagueID = require('../models/leagueIDs')
//var leagues = await LeagueID.find()
//var teams = await TeamID.find()

async function getTeams() {

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

// async function getTeams() {
// 	var aTeams = []
// 	for (const team of teams.keys()) {
//     console.log("Iddaa: ", teams.get(team), " Betfair: ", team)
// 		var aliases = []
// 		aliases.push(team)
// 		const teamId = new TeamID({
// 			iddaaName: teams.get(team),
// 			aliases: aliases
// 		})
// 		teamId.save()
// 			.then((result) => {
// 				//console.log("New record created for match: ", q.id)
// 			})
// 			.catch((err) => {
// 				console.log("New record creation failed: ", err)
// 			})
// 		aTeams.push(teamId)
//   }
// 	return aTeams
// }
module.exports.getTeams = getTeams
