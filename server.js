const express = require('express')
const scraper = require('./utils/scraper')
const admin = require('./utils/admin')

const app = express()

app.use(express.static('css'))
app.set('view engine', 'pug')

app.get(['/','/main'], (req, res) => {
  const iddaaCoefficients = new Promise((resolve, reject) => {
    scraper
      .scrapeIddaa(req.query)
      .then(data => {
        resolve(data)
      })
      .catch(err => console.log(err))
  })

  Promise.all([iddaaCoefficients])
    .then(data => {
      res.render('index_main', { data: { iddaa: data[0] } })
    })
    .catch(err => res.status(500).send(err))
})

app.get('/api', (req, res) => {
  const getCoefficients = new Promise((resolve, reject) => {
    scraper
      .scrapeAPI(req.query)
      .then(data => {
        resolve(data)
      })
      .catch(err => console.log(err))
  })

  Promise.all([getCoefficients])
    .then(data => {
      res.render('index_api', { data: { allCoefficients: data[0] } })
    })
    .catch(err => res.status(500).send(err))
})

app.get('/version', (req, res) => {
  const version = new Promise((resolve, reject) => {
    scraper
      .getVersion()
      .then(data => {
        resolve(data)
      })
      .catch(err => console.log("getVersion error: ", err))
  })

  Promise.all([version])
    .then(data => {
      res.render('index_version', data)
    })
    .catch(err => {
      console.log("Error: ", err)
      res.status(500).send(err)
    })
})

app.get('/admin', (req, res) => {
  const getTeams = new Promise((resolve, reject) => {
    admin
      .getTeams()
      .then(data => {
        resolve(data)
      })
      .catch(err => console.log("admin error: ", err))
  })

  Promise.all([getTeams])
    .then(data => {
      res.render('index_admin', { data: { teams: data[0] } })
    })
    .catch(err => {
      console.log("Error: ", err)
      res.status(500).send(err)
    })
})

app.get('/summary', (req, res) => {
  const getSummary = new Promise((resolve, reject) => {
    scraper
      .getSummary(req.query)
      .then(data => {
        resolve(data)
      })
      .catch(err => console.log(err))
  })

  Promise.all([getSummary])
    .then(data => {
      res.render('index_summary', { data: { summary: data[0] } })
    })
    .catch(err => {
      console.log("Error: ", err)
      res.status(500).send(err)
    })
})

app.get('/delete', (req, res) => {
  const deleteFromMongoDB = new Promise((resolve, reject) => {
    scraper
      .deleteFromMongoDB(req.query)
      .then(data => {
        resolve(data)
      })
      .catch(err => console.log(err))
  })

  Promise.all([deleteFromMongoDB])
    .then(data => {
      res.render('index_scrape_input', { data: { id: data }})
    })
    .catch(err => console.log(err))
  })

const mongoose = require('mongoose');

const MongoURI = "mongodb+srv://scraper:ScrapeR1234@cluster0.qbujx.mongodb.net/scraperDB?retryWrites=true&w=majority";
mongoose.connect(MongoURI,{ useNewUrlParser: true, useUnifiedTopology: true })
  .then ((result) => {console.log("Connected to MongoDB"); app.listen(process.env.PORT || 3000)})
  .catch ((err) => console.log("Connection failed: ", err))