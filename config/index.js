require('dotenv').config()
module.exports = {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_ACCESS_TOKEN,
    limit: 100,
  };