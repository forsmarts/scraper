const mongoose = require('mongoose')

const leagueIDSchema = new mongoose.Schema ({
    iddaaName: {
        type: String,
        required: true
    },
    betfairName: String,
    betfairId: Number
})

const LeagueID = mongoose.model('LeagueID', leagueIDSchema)

module.exports = LeagueID