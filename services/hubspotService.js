const hubspot = require('@hubspot/api-client');
const config = require('../config');

const fetchData = async (req, res) => {
  const hubspotClient = new hubspot.Client({ accessToken: config.accessToken });
  const properties = ["latitude", "longitude", "dealname", "pays", "type_of_project__pv_", "amount", "pipeline"];

  try {
    const apiResponse = await hubspotClient.crm.deals.basicApi.getPage(
      config.limit,
      undefined,
      properties,
      undefined,
      undefined,
      false
    );
    res.json(apiResponse);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  fetchData,
};
