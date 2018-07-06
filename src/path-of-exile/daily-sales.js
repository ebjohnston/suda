const cheerio = require('cheerio')
const request = require('request')

var deals = []

request('https://www.pathofexile.com/shop/category/daily-deals', (err, response, body) => {
  if (err) {
    return console.error(err)
  }

  let $ = cheerio.load(body)

  $('.shopItems').children().each((index, element) => {
    deals[index] = {}
    deals[index]['name'] = $('.name[href=#]', element).text()
    deals[index]['price'] = $('.price', element).text()
    deals[index]['discount'] = $('.value', element).text()

    var previewUrl = $('.video', element).attr('data-src')
    var youtubeId = previewUrl.substring(24, previewUrl.indexOf('?'))
    deals[index]['preview'] = youtubeId
  })

  console.log('deals: ' + JSON.stringify(deals))
})
