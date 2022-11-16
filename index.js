require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
const dns = require('node:dns');
const dnsOptions = {
  family: 4,
  hints: dns.ADDRCONFIG | dns.V4MAPPED,
};

const mongoose = require('mongoose')
const mongoURI = process.env.MONGO_URI

mongoose.connect(mongoURI, {useNewUrlParser: true, useUnifiedTopology:true})

const shortSchema = new mongoose.Schema({
  url: { type: String, required: true},
  shorten: String
})

const Shorty = mongoose.model('shorty', shortSchema)

const generateShortUrl = (len = 6) => {
  let res = "";
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  
  for (let i = 0; i < len; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

const lookupDns = async (host) => {
  return new Promise((resolve, reject) => {
    dns.lookup(host, (err, address, family) => {
      if (err) {
        reject(err);
      }
      resolve(address);
    });
  });
}

const findShorty = async param => {
    return await Shorty.findOne({shorten: param},'url shorten')
    .then(async (shorty) => {

      if (shorty) {
        return shorty
      }
      
      return { error: "invalid url" }
    })
}

const createShorty = async url => {
  return await Shorty.findOne( {url: url },'shorten') 
  .then(async (findUrl) => {

    if (!findUrl) {
      console.log('not found')
      let shorterUrl = generateShortUrl()
      let row = new Shorty({
        url: url,
        shorten: shorterUrl
      })
      await row.save()
      return shorterUrl
    } 
    
    return findUrl.shorten
  })
    
}

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl',express.urlencoded({extended:true}), async (req, res) => {
    
  const inputURL = req.body.url

  try {
  
    const uri = new URL(inputURL)

    if (uri.protocol != "https:")
          throw new Error("Bad protocol");

    await lookupDns(uri.hostname)
        
    let shortURL = await createShorty(inputURL);
        
    res.json({
      original_url: inputURL,
      short_url: shortURL
    })
    
  } catch (err) {
    console.log(inputURL, err)
    res.json({ error: "invalid url"})
  }  
})

app.get('/api/shorturl/:id', async (req, res) => {

  try {
    const id = req.params.id
    const shorty = await findShorty(id)
    
    if ('url' in shorty) 
      res.redirect(shorty.url)
        
  } catch(e) {
      res.send({
        error: e.message
      })
  }
})

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
