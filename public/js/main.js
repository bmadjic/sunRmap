// Creating the layers per project type
const carportGroup = L.layerGroup();
const floatingGroup = L.layerGroup();
const groundGroup = L.layerGroup();
const rooftopGroup = L.layerGroup();
const unknownGroup = L.layerGroup();

const countriesGroup = L.layerGroup();

// Map 
var map = L.map('map', {
  center: [51.505, -0.09],
  zoom: [2],
  layers: [carportGroup, floatingGroup, groundGroup, rooftopGroup, unknownGroup]
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);



// Icons
var carportIcon = L.icon({
  //iconUrl: '/images/carport.png',
  iconUrl: '/images/blue.png',
  iconSize: [25, 41],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50]
});

var floatingIcon = L.icon({
  //iconUrl: '/images/floating.png',
  iconUrl: '/images/green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -50]
});

var groundIcon = L.icon({
  //iconUrl: '/images/ground.png',
  iconUrl: '/images/yellow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -50]
});

var rooftopIcon = L.icon({
  //iconUrl: '/images/rooftop.png',
  iconUrl: '/images/violet.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -50]
});


var unknownIcon = L.icon({
  //iconUrl: '/images/pin.svg',
  iconUrl: '/images/grey.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -50]
});


// Function to make the API call and return the data
async function fetchApiData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    //return data.results;
    return data.results.filter(item => item.properties.pipeline == 52295361);
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

// Function to display the API data in a debug format
async function displayApiResult(results) {
  if (results && Array.isArray(results)) {
    let output = '<h2>Data from API:</h2><ol>';
    results.forEach((item) => {
      output += `
      <li>
      Deal Name: ${item.properties.dealname || 'N/A'}, 
      Latitude: ${item.properties.latitude || 'N/A'}, 
      Longitude: ${item.properties.longitude || 'N/A'}, 
      Country: ${item.properties.pays || 'N/A'},
      Project Type: ${item.properties.type_of_project__pv_ || 'N/A'},
      Amount: ${item.properties.amount || 'N/A'},
      Pipeline : ${item.properties.pipeline || 'N/A'}
      </li>`;
    });
    output += '</ol>';
    document.getElementById('api-data').innerHTML = output;
  }
}

// Function to add pins to the map
const projectTypeClusterGroups = {
  'Carport': L.layerGroup().addTo(map),
  'Floating': L.layerGroup().addTo(map),
  'Ground': L.layerGroup().addTo(map),
  'Rooftop': L.layerGroup().addTo(map),
  'Unknown': L.layerGroup().addTo(map)
};
const countryTypeClusterGroups = {};

function addPinsToMap(results) {
  results.forEach((item) => {
    const latitude = parseFloat(item.properties.latitude);
    const longitude = parseFloat(item.properties.longitude);
    const projectType = item.properties.type_of_project__pv_ || 'Unknown';
    const country = item.properties.pays || 'Unknown';
    
    if (!isNaN(latitude) && !isNaN(longitude)) {
      let selectedIcon;
      switch (projectType.toLowerCase()) {
        case 'carport':
          selectedIcon = carportIcon;
          break;
        case 'floating':
          selectedIcon = floatingIcon;
          break;
        case 'ground':
          selectedIcon = groundIcon;
          break;
        case 'rooftop':
          selectedIcon = rooftopIcon;
          break;
        default:
          selectedIcon = unknownIcon;
      }
      
      const marker = L.marker([latitude, longitude], { icon: selectedIcon })
      .bindPopup(`
      <strong>${item.properties.dealname || 'N/A'}</strong> <br>
      <strong>Power:</strong> ${item.properties.amount || 'N/A'} MWp<br>
      <strong>Country:</strong> ${item.properties.pays || 'N/A'}<br>
      <strong>Project Type:</strong> ${projectType}
      `);
      
      const clusterKey = `${country}-${projectType}`;
      
      if (!countryTypeClusterGroups[clusterKey]) {
        countryTypeClusterGroups[clusterKey] = L.markerClusterGroup().addTo(map);
      }

      countryTypeClusterGroups[clusterKey].addLayer(marker);
      if (projectTypeClusterGroups[projectType]) {
        projectTypeClusterGroups[projectType].addLayer(countryTypeClusterGroups[clusterKey]);
      }
    }
  });
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
          let popupContent = `<strong>Country:</strong> ${countryName}<br>`;
          
          
          // Include total power for each project type
          for (const type in powerData) {
            if (type !== 'total') {
              popupContent += `<strong>${type} Power:</strong> ${powerData[type].toFixed(2)} MWP<br>`;
            }
          }
          popupContent += `<strong>Total Power: ${powerData.total.toFixed(2)} MWP</strong><br>`;
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
