const express = require('express')

const scraper = require('./utils/scraper')
const app = express()

app.use(express.static('css'))
app.set('view engine', 'pug')

app.get('/', (req, res) => {
  const iddaaCoefficients = new Promise((resolve, reject) => {
    scraper
      .scrapeIddaa()
      .then(data => {
        resolve(data)
      })
      .catch(err => console.log(err))
  })

  Promise.all([iddaaCoefficients])
    .then(data => {
      res.render('index', { data: { iddaa: data[0] } })
    })
    .catch(err => res.status(500).send(err))
})

app.get('/temp', (req, res) => {
  const betfairCoefficients = new Promise((resolve, reject) => {
    scraper
      .scrapeBetfair(req.query)
      .then(data => {
        resolve(data)
      })
      .catch(err => console.log(err))
  })

  Promise.all([betfairCoefficients])
    .then(data => {
      res.render('index_temp', { data: { betfair: data[0] } })
    })
    .catch(err => res.status(500).send(err))
})

app.listen(process.env.PORT || 3000)
