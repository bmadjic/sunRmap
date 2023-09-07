// Creating the layers per project type
const carportGroup = L.layerGroup();
const floatingGroup = L.layerGroup();
const groundGroup = L.layerGroup();
const rooftopGroup = L.layerGroup();
const unknownGroup = L.layerGroup();

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
    return data.results;
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
      Amount: ${item.properties.amount || 'N/A'}
      </li>`;
    });
    output += '</ol>';
    document.getElementById('api-data').innerHTML = output;
  }
}

// Function to add pins to the map

function addPinsToMap(results) {
  results.forEach((item) => {
    const latitude = parseFloat(item.properties.latitude);
    const longitude = parseFloat(item.properties.longitude);
    const projectType = item.properties.type_of_project__pv_ || 'Unknown';
    const country = item.properties.pays || 'Unknown';
    
    if (!isNaN(latitude) && !isNaN(longitude)) {
      let selectedIcon;
      let projectTypeLower = projectType.toLowerCase();
      let layerGroup;
      
      switch (projectTypeLower) {
        case 'carport':
        selectedIcon = carportIcon;
        layerGroup = carportGroup;
        break;
        case 'floating':
        selectedIcon = floatingIcon;
        layerGroup = floatingGroup;
        break;
        case 'ground':
        selectedIcon = groundIcon;
        layerGroup = groundGroup;
        break;
        case 'rooftop':
        selectedIcon = rooftopIcon;
        layerGroup = rooftopGroup;
        break;
        default:
        selectedIcon = unknownIcon;
        layerGroup = unknownGroup;
        break;
      }
      
      // Add a pin to the map
      const marker = L.marker([latitude, longitude], { icon: selectedIcon })
      .bindPopup(`
      <strong>${item.properties.dealname || 'N/A'}</strong> <br>
      <strong>Power:</strong> ${item.properties.amount || 'N/A'} MWp<br>
      <strong>Country:</strong> ${item.properties.pays || 'N/A'}<br>
      <strong>Project Type:</strong> ${projectType}
      
      `);

      
      layerGroup.addLayer(marker);
      
    }
  });
}

// Function to execute when the page loads
window.addEventListener('load', async (event) => {
  const results = await fetchApiData();
  
  displayApiResult(results);  // Call to display the data
  addPinsToMap(results);  // Call to add pins to the map
  // Add these layer groups to an object for use in the Layer Control
  const overlayMaps = {
    'Carport': carportGroup,
    'Floating': floatingGroup,
    'Ground': groundGroup,
    'Rooftop': rooftopGroup,
    'Unknown': unknownGroup
  };
  
  // Initialize the Layer Control
  L.control.layers(null, overlayMaps).addTo(map);
});
