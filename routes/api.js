const express = require('express');
const hubspotService = require('../services/hubspotService');

const router = express.Router();

router.get('/data', hubspotService.fetchData);

module.exports = router;
