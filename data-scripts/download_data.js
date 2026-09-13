const fs = require('fs');
require('dotenv').config();
const API_KEY = process.env.API_KEY;
const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD; 
const LIMIT = 50;
const BASE_URL = 'https://solve.ivy.homes';

async function fetchRentals() {
  try {
    console.log('Logging in...');

    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY 
      },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed! Status: ${loginResponse.status} - ${errorData.detail}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token;

    console.log('Fetching page 1...');
    const firstPageUrl = `${BASE_URL}/v1/rentals?page=1&limit=${LIMIT}`;
    
    const requestHeaders = {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${token}`
    };

    const firstResponse = await fetch(firstPageUrl, { headers: requestHeaders });
    
    if (!firstResponse.ok) {
      const errorData = await firstResponse.json(); 
      throw new Error(`HTTP error! Status: ${firstResponse.status} - ${errorData.detail}`);
    }
    
    const firstData = await firstResponse.json();
    const total = firstData.total; 
    let allRentals = firstData.results || []; 

    const totalPages = Math.ceil(total / LIMIT);
    console.log(`Found ${total} total rentals across ${totalPages} pages.`);

    for (let page = 2; page <= totalPages; page++) {
      console.log(`Fetching page ${page} of ${totalPages}...`);
      
      const pageUrl = `${BASE_URL}/v1/rentals?page=${page}&limit=${LIMIT}`;
      const response = await fetch(pageUrl, { headers: requestHeaders });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to fetch page ${page}. Server says:`, errorData);
        continue;
      }

      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        allRentals = allRentals.concat(data.results);
      }
    }

    console.log(`\nFinished fetching! Successfully retrieved ${allRentals.length} rentals.`);

    fs.writeFileSync('rentals.json', JSON.stringify(allRentals, null, 2));
    console.log('Data saved to rentals.json');

  } catch (error) {
    console.error('An error occurred during the fetch process:', error);
  }
}

fetchRentals();