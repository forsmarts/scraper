const mongoose = require('mongoose')

const performanceLogSchema = new mongoose.Schema ({
    totalLoadTime: Number,
    leaguesTeamsFromMongoDB: Number,
    iddaa: Number,
    iddaaCount: Number,
    betfair: []
}, {timestamps: true})

const PerformanceLog = mongoose.model('PerformanceLog', performanceLogSchema)

module.exports = PerformanceLog