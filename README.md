# Add the API key to .env
```
cp .env.dist
```
add the api key in .env file

# Install the dependencies
```
npm install @hubspot/api-client express leaflet cors dotenv
```

# Run the server
```
node server.js
```

# add iframe
```
<iframe src="http://localhost:3000/leaflet_map.html" width="600" height="400" scrolling="no" frameborder="0"></iframe>
```
