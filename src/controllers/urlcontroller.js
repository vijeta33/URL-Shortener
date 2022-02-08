const urlModel = require("../models/urlModel")
const shortid = require('shortid');
const baseUrl = 'http://localhost:3000'
const validUrl = require('valid-url')
const redis = require("redis");
const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  16319,
  "redis-16319.c10.us-east-1-2.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("LpxuQlBSMm7MFYavCb9WaXgPzK7s7NjL", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
})

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



//Post Api to Create Longer to Shorten URL...
const createUrl = async function(req, res) {
    try {
        if (!(Object.keys(req.body).length > 0)) { // Checking Body is not Empty
            res.status(400).send("No Url Found")
        }

        const longUrl = req.body.longUrl.trim();

        //validation start
        if (!/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/.test(longUrl)) {
            if (!/(.com|.org|.co.in|.in|.co|.us)/.test(longUrl)) 
        return res.status(400).send({ status: false, message: `This is not a valid Url` });
    }
    if (!(longUrl.includes('//'))) {
       return res.status(400).send({ status: false, msg: 'Invalid longUrl' })
     }

     
  //validation end

        if (validUrl.isUri(longUrl)) { //used  valid url package
            const shortCode = shortid.generate();
            let checkUrl = await urlModel.findOne({ longUrl: longUrl })
            if (checkUrl) {
                return res.send({ message: " You already created Short Url for this Long Url :", data: checkUrl })

            } else {
                const shortUrl = baseUrl + '/' + shortCode;
                const storedData = { longUrl, shortUrl, urlCode: shortCode }
                let savedData = await urlModel.create(storedData)
                res.status(200).send({ status: true, data: savedData })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid Long Url" })
        }
    } catch (err) {
        res.status(500).send(err.message);
    }

}



//This is my Second Get API to redirect from short url to Corresponding Long url
const getUrl = async function(req, res) {
    try {

        let urlCode = req.params.urlCode
            
        const getAsync = await GET_ASYNC(`${urlCode}`)
        if (getAsync) {
            const parseData = JSON.parse(getAsync)
            console.log("Data Fetch")
                
            return res.redirect(parseData.longUrl)
        } else if (urlCode) {
          
            const Findurl = await urlModel.findOne({ urlCode: urlCode })
              
            if (Findurl) {
                const storeCacheData = await SET_ASYNC(`${urlCode}`, JSON.stringify(Findurl))
                console.log("Data Got Stored", storeCacheData)
                return res.status(302).redirect(Findurl.longUrl)

            } else {
                res.status(400).send({ status: false, message: "There is No Short Url Found" })
            }
        } else {
            return res.status(404).send({ status: false, message: "No Url Code Params Found" })
        }


    } catch (err) {
        res.status(500).send(err.message);
    }
}


module.exports = {createUrl,getUrl}
