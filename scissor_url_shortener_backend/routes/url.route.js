const express = require("express");
const urlModel = require("../models/url.model");
const validUrl = require("valid-url");
const shortId = require("shortid")
const requestIP = require('request-ip');
var QRCode = require('qrcode')
const redis = require('redis');
const authMiddleware = require("../authMiddleware")
require('dotenv').config();

const urlRoute = express.Router();

const redisClient = redis.createClient({ url: process.env.REDIS_URI });

const DEFAULT_EXPIRATION = 60;

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (error) => { 
  console.error('Redis connection error:', error);
});



urlRoute.get('/', authMiddleware, async (req, res) => { 
  
  try {
    redisClient.get(`/${req.user}`, async (error, urlInfo) => { 
      if (error) {
        console.error(error);
      }
      if (urlInfo != null) {  
        return res.json(JSON.parse(urlInfo));
      } else {    
        const url = await urlModel.find({ creator: req.user }).sort({ _id: -1 }).limit(20);
        redisClient.setex(`/${req.user}`, DEFAULT_EXPIRATION, JSON.stringify(url));
        res.status(200).json(url);
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err });
  }
});



urlRoute.get('/:urlCode', async (req, res) => {
    const urlData = await urlModel.findOne({ urlCode: req.params.urlCode });
    const ipAddress = await requestIP.getClientIp(req);

    if (urlData) {
      urlData.clicks++;
      if (!urlData.ipAddress.includes(ipAddress)) {
          urlData.ipAddress.push(ipAddress);
        }
        urlData.save();
        
        // Invalidate the cache for the URL list
        redisClient.del(`/${req.user}`, (error, result) => {
          if (error) {
            console.error(error);
          }
        });
        
        res.redirect(urlData.longUrl);
    } else {
      return res.status(404).json("No URL found");
    }

});



urlRoute.post('/', authMiddleware, async (req, res) => {
  

  let { longUrl, urlCode } = req.body;

  const baseUrl = process.env.BASE_URL;

  const creator = req.user

  //verify that base url is valid
  if(!validUrl.isUri(baseUrl)) {
    return res.status(401).json("Invalid base URL");
  }

  //Generate short URL code if there is none
  if (!urlCode) {
    urlCode = shortId.generate() 
  }

  //Verify Long URL
  if(validUrl.isUri(longUrl)) {
    try {
      //check if long url is already in the database and return its details if its there already. Else create new short Uurl details for it

      const conditions = {longUrl, creator }
      let url = await urlModel.findOne( conditions).exec()
      if (url) {
        res.json(url)
      } else {
        let codeCheck = await urlModel.findOne({ urlCode })
        if (codeCheck) {
          res.send("URL Code exists Already")
        } else {
          const shortUrl = baseUrl + "/" + urlCode

          const qrCode = await QRCode.toDataURL(longUrl)

          

          url = await urlModel.create({
            longUrl,
            shortUrl,
            urlCode,
            qrCode,
            creator,
            date: new Date()
          });
          
          // Invalidate the cache for the URL list
          redisClient.del(`/${req.user}`, (error, result) => {
            if (error) {
              console.error(error);
            }
            console.log("Invalidated cache for URL list");
          });

          res.json(url)
        }
        
      }
    } catch (error) {
        res.status(500).json("Server Error")
    }
  } else {
    res.status(401).json("invalid long url")
  }

})
 


urlRoute.delete('/:id', authMiddleware, async (req, res) => {
  const urlId = req.params.id;
  try {
    // Delete the URL from the database
    const url = await urlModel.findById(urlId);
    
    if (url.creator == req.user) {
      await urlModel.findByIdAndDelete(urlId)

      // Delete the corresponding Redis data
      redisClient.del(`/${urlId}`, (error, result) => {
        if (error) {
          console.error(error);
        }
        console.log(`Deleted Redis data for URL with id: ${urlId}`);
      
        // Invalidate the cache for the deleted URL
        redisClient.del(`/${req.user}`, (error, result) => {
          if (error) {
            console.error(error);
          }
          console.log("Invalidated cache for URL list");
        });
      }); 
      
      res.status(200).json("URL successfully deleted...");
    } else {
      res.status(404).json("You can only delete URL's you created");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});


  


module.exports = urlRoute; 