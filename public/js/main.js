// Map 
var map = L.map('map').setView([51.505, -0.09], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);



// Icons
var carportIcon = L.icon({
    iconUrl: '/images/carport.png',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50]
});

var floatingIcon = L.icon({
    iconUrl: '/images/floating.png',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50]
});

var groundIcon = L.icon({
    iconUrl: '/images/ground.png',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50]
});

var rooftopIcon = L.icon({
    iconUrl: '/images/rooftop.png',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
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
            selectedIcon = L.Icon.Default; // Default Leaflet icon
            break;
        }
  
        // Add a pin to the map
        L.marker([latitude, longitude], { icon: selectedIcon }).addTo(map)
          .bindPopup(`
            <strong>${item.properties.dealname || 'N/A'}</strong> <br>
            <strong>Power:</strong> ${item.properties.amount || 'N/A'} MWp<br>
            <strong>Country:</strong> ${item.properties.pays || 'N/A'}<br>
            <strong>Project Type:</strong> ${projectType}
            
          `);
      }
    });
  }
  
  // Function to execute when the page loads
  window.addEventListener('load', async (event) => {
    const results = await fetchApiData();
    
    displayApiResult(results);  // Call to display the data
    addPinsToMap(results);  // Call to add pins to the map
  });
  