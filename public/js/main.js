// Initialisation de la carte
var map = L.map('map', {
  center: [51.505, -0.09],
  zoom: 2,
});

// Ajout du fond de carte
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Configuration des icônes
const iconsConfig = {
  'Carport': '/images/blue.png',
  'Floating': '/images/green.png',
  'Ground': '/images/yellow.png',
  'Roof': '/images/violet.png',
  'Unknown': '/images/grey.png'
};

const dealStageNames = {
  '134157045': 'Qualification',
  '134157049': 'Land contractualization',
  '134164162': 'Early development',
  '174987747': 'Advanced development',
  '137866965': 'Lost'
};


function createIcon(url) {
  return L.icon({
    iconUrl: url,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -50]
  });
}

const icons = {};
for (const [type, url] of Object.entries(iconsConfig)) {
  icons[type] = createIcon(url);
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



function createMarker(item, selectedIcon, latitude, longitude) {
  const stageName = dealStageNames[item.properties.dealstage] || item.properties.dealstage;  // Use the name if it exists, otherwise use the ID

  const marker = L.marker([latitude, longitude], { icon: selectedIcon })
    .bindPopup(`<strong>${item.properties.dealname || 'N/A'}</strong><br>
    <strong>Power:</strong> ${item.properties.amount || 'N/A'} MWp<br>
    <strong>Stage:</strong> ${stageName}<br>
    <strong>Project Type:</strong> ${item.properties.type_of_project__pv_ || 'Unknown'}`);
    
  marker.feature = item;  // attach the feature data here
  
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
        const selectedIcon = icons[projectType] || icons['Unknown'];
        const marker = createMarker(item, selectedIcon, latitude, longitude);
        addToCluster(marker, projectType, country);
      }
    }
  });
}



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


// Function to load and display countries from GeoJSON
function loadCountries(results) {
  // Create an object to hold the total power and power by type for each country
  const countryPower = {};

  // Initialize the object with the sum of power for each country and type
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

  
  // Extract unique countries from results
  const uniqueCountries = new Set(results.map(item => item.properties.pays));

  fetch('/data/countries.geojson')
    .then(response => response.json())
    .then(data => {
      // Filter GeoJSON data to include only countries present in results
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
