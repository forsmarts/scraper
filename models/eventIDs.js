const mongoose = require('mongoose')

const eventIDSchema = new mongoose.Schema ({
    iddaaID: {
        type: Number,
        required: true
    },
    betfairID: Number,
    link: String
}, {timestamps: true})

const EventID = mongoose.model('EventID', eventIDSchema)

module.exports = EventID