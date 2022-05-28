const mongoose = require('mongoose')

const teamIDSchema = new mongoose.Schema ({
    iddaaName: {
        type: String,
        required: true
    },
    aliases: []
})

const TeamID = mongoose.model('TeamID', teamIDSchema)

module.exports = TeamID