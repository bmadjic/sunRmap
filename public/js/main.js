// Initialisation de la carte
var map = L.map('map', {
  center: [51.505, -0.09],
  zoom: 2,
});

// Ajout du fond de carte
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.{ext}', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ext: 'png'
}).addTo(map);

// Configuration des icônes
const iconsConfig = {
  'Carport': '/images/carport.png',
  'Floating': '/images/floating.png',
  'Ground': '/images/ground.png',
  'Roof': '/images/rooftop.png',
  'Unknown': '/images/grey.png'
};

const dealStageNames = {
  '134157045': 'Qualification',
  '134157049': 'Land contractualization',
  '134164162': 'Early development',
  '174987747': 'Advanced development',
  '137866965': 'Lost'
};


function createIconWithPower(url, power) {
  return L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
          <div style="text-align: center;">
              <img src="${url}" width="50" />
              <div style="font-weight: bold; font-size: 12px; color: #000; width:50px;
              ">${power} MWp</div>
          </div>
      `,
      iconSize: [40, ],
      iconAnchor: [25 , 25],
      popupAnchor: [0, -25]
  });
}




const icons = {};
for (const [type, url] of Object.entries(iconsConfig)) {
  icons[type] = url;  // Just store the URL, not an icon object
}



// Groupes de calques par type de projet
const projectTypeClusterGroups = {
  'Carport': L.layerGroup().addTo(map),
  'Floating': L.layerGroup().addTo(map),
  'Ground': L.layerGroup().addTo(map),
  'Roof': L.layerGroup().addTo(map),
  'Unknown': L.layerGroup().addTo(map)
};

const countryTypeClusterGroups = {};
const countriesGroup = L.layerGroup();

// Fonctions auxiliaires
async function fetchApiData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data.results.filter(item => item.properties.pipeline == 52295361);
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

function displayApiResult(results) {
  if (results && Array.isArray(results)) {
    let output = '<h2>Data from API:</h2><ol>';
    results.forEach((item) => {
      output += `<li>Deal Name: ${item.properties.dealname || 'N/A'}, Latitude: ${item.properties.latitude || 'N/A'}, Longitude: ${item.properties.longitude || 'N/A'}, Country: ${item.properties.pays || 'N/A'}, Project Type: ${item.properties.type_of_project__pv_ || 'N/A'}, Amount: ${item.properties.amount || 'N/A'}, Pipeline: ${item.properties.pipeline || 'N/A'}, Stage: ${item.properties.dealstage || 'N/A'}</li>`;
    });
    output += '</ol>';
    document.getElementById('api-data').innerHTML = output;
  }
}



function createMarker(item, iconUrl, latitude, longitude) {
  const power = item.properties.amount || 'N/A';

  // Create a new icon for each marker with its respective power
  const markerIcon = createIconWithPower(iconUrl, power); 

  const stageName = dealStageNames[item.properties.dealstage] || item.properties.dealstage;
  const marker = L.marker([latitude, longitude], { icon: markerIcon })
      .bindPopup(`<strong>${item.properties.dealname || 'N/A'}</strong><br>
      <strong>Power:</strong> ${power} MWp<br>
      <strong>Stage:</strong> ${stageName}<br>
      <strong>Project Type:</strong> ${item.properties.type_of_project__pv_ || 'Unknown'}`);
      
  marker.feature = item;
  return marker;
}

function createClusterIcon(cluster) {
  const markers = cluster.getAllChildMarkers();
  let totalPower = 0;
  markers.forEach(marker => {
      const power = parseFloat(marker.feature.properties.amount) || 0;
      totalPower += power;
  });

  const size = getSizeForPower(totalPower);

  return new L.DivIcon({
      html: `<div style="width: ${size}px; height: ${size}px; line-height: ${size}px;"><span>${totalPower.toFixed(0)}</span></div>`,
      className: 'marker-cluster',
      iconSize: new L.Point(size, size)
  });
}


function getSizeForPower(power) {
  const baseSize = 20; // Base size of the cluster
  const multiplier = 5; // Multiplier for the logarithmic scale

  // Compute size based on logarithmic scale and cap it to min and max values
  let size = baseSize + multiplier * Math.log(power + 1);
  const minSize = 10;
  const maxSize = 50;

  return Math.min(Math.max(size, minSize), maxSize);
}


function addToCluster(marker, projectType, country) {
  const clusterKey = `${country}-${projectType}`;
  if (!countryTypeClusterGroups[clusterKey]) {
    countryTypeClusterGroups[clusterKey] = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon
    }).addTo(map);
  }
  countryTypeClusterGroups[clusterKey].addLayer(marker);
  if (projectTypeClusterGroups[projectType]) {
    projectTypeClusterGroups[projectType].addLayer(countryTypeClusterGroups[clusterKey]);
  }
}

function addPinsToMap(results) {
  results.forEach((item) => {
    // Check if the stage is not "lost"
    if(item.properties.dealstage !== '137866965') { // Exclude items in the "lost" stage
      const latitude = parseFloat(item.properties.latitude);
      const longitude = parseFloat(item.properties.longitude);
      const projectType = item.properties.type_of_project__pv_ || 'Unknown';
      const country = item.properties.pays || 'Unknown';

      if (!isNaN(latitude) && !isNaN(longitude)) {
        const iconUrl = icons[projectType] || icons['Unknown'];
        const marker = createMarker(item, iconUrl, latitude, longitude);
        addToCluster(marker, projectType, country);
      }
    }
  });
}


// --------------------------------
// -------- Country layers --------
// --------------------------------

function generateProjectListForCountry(countryName, results) {
  const projectsInCountry = results.filter(item => item.properties.pays === countryName);

  if (projectsInCountry.length === 0) return '<p>No projects for this country.</p>';

  let tableContent = '<table border="1" cellspacing="0" cellpadding="5">';
  tableContent += '<thead><tr><th>Name</th><th>Type</th><th>Stage</th><th>Power (MWp)</th></tr></thead><tbody>';

  projectsInCountry.forEach(project => {
      const name = project.properties.dealname || 'N/A';
      const type = project.properties.type_of_project__pv_ || 'Unknown';
      const stageId = project.properties.dealstage;
      const stage = dealStageNames[stageId] || stageId;
      const power = project.properties.amount || 'N/A';

      tableContent += `<tr><td>${name}</td><td>${type}</td><td>${stage}</td><td>${power}</td></tr>`;
  });

  tableContent += '</tbody></table>';
  return tableContent;
}

function calculateCountryPower(results) {
  const countryPower = {};

  results.forEach(item => {
      const country = item.properties.pays;
      const projectType = item.properties.type_of_project__pv_ || 'Unknown';
      const power = parseFloat(item.properties.amount) || 0;

      if (!countryPower[country]) {
          countryPower[country] = { total: 0 };
      }

      countryPower[country].total += power;

      if (!countryPower[country][projectType]) {
          countryPower[country][projectType] = 0;
      }

      countryPower[country][projectType] += power;
  });

  return countryPower;
}

function getUniqueCountries(results) {
  return new Set(results.map(item => item.properties.pays));
}

function createPopupContent(countryName, powerData, results) {
  let popupContent = `<strong>${countryName}</strong><br>`;
        
  // Include total power for each project type
  for (const type in powerData) {
      if (type !== 'total') {
          popupContent += `<strong>${type} Power:</strong> ${powerData[type].toFixed(2)} MWp<br>`;
      }
  }

  popupContent += `<strong>Total Power: ${powerData.total.toFixed(2)} MWp</strong><br>`;
  popupContent += '<br><a href="#" onclick="event.preventDefault(); this.nextSibling.style.display = \'block\';">Show Projects</a>';
  popupContent += `<div style="display:none;">${generateProjectListForCountry(countryName, results)}</div>`;

  return popupContent;
}

function loadCountries(results) {
  const countryPower = calculateCountryPower(results);
  const uniqueCountries = getUniqueCountries(results);

  fetch('/data/countries.geojson')
      .then(response => response.json())
      .then(data => {
          const filteredData = {
              ...data,
              features: data.features.filter(feature => uniqueCountries.has(feature.properties.ADMIN))
          };

          L.geoJSON(filteredData, {
              style: function(feature) {
                  return { color: '#EF6D23' };
              },
              onEachFeature: function(feature, layer) {
                  const countryName = feature.properties.ADMIN;
                  const powerData = countryPower[countryName] || { total: 0 };
                  const popupContent = createPopupContent(countryName, powerData, results);
                  layer.bindPopup(popupContent);
              }
          }).addTo(countriesGroup);
      })
      .catch(error => console.error('Error loading GeoJSON:', error));
}

// Function to execute when the page loads
window.addEventListener('load', async (event) => {
  const results = await fetchApiData();
  
  displayApiResult(results);  // Call to display the data
  addPinsToMap(results);  // Call to add pins to the map
  // Add these layer groups to an object for use in the Layer Control
  const overlayMaps = {
    'Countries': countriesGroup,
    ...projectTypeClusterGroups // Ajoute les groupes par type de projet
  };
  
  loadCountries(results);
  // Initialize the Layer Control
  L.control.layers(null, overlayMaps).addTo(map);
  countriesGroup.addTo(map);

});
