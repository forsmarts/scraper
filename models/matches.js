const mongoose = require('mongoose')
const Schema = mongoose.Schema

const matchSchema = new Schema ({
    match: {
        type: String,
        required: true
    },
    league: {
        type: String,
        required: true
    },
    url: {
        type: String
    },
    date: {
        type: Date
    }
}, {timestamps: true})

const Match = mongoose.model('Match', matchSchema)

module.exports = Match