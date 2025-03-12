// test-query.js - Script to test the Pinecone API connector
// You can use this locally to test before connecting to your Custom GPT

const axios = require('axios');
require('dotenv').config();

// This would be your Render URL in production
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Example vector - in reality, this would be generated by an embedding model
// This is a simple 5-dimensional vector for testing purposes
const testVector = Array(1536).fill(0).map(() => Math.random() * 2 - 1);

async function testQuery() {
  try {
    console.log('Testing /query endpoint...');
    
    const response = await axios.post(`${API_URL}/query`, {
      vector: testVector,
      topK: 3
    });
    
    console.log('Query Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.matches && response.data.matches.length > 0) {
      console.log('\nTest successful! Found matches in your Pinecone database.');
    } else {
      console.log('\nQuery executed successfully, but no matches were found.');
      console.log('This could be normal if your database is empty or if the random test vector is not similar to any stored vectors.');
    }
  } catch (error) {
    console.error('Error testing query:', error.response ? error.response.data : error.message);
  }
}

async function testHealthCheck() {
  try {
    console.log('Testing health check endpoint...');
    
    const response = await axios.get(API_URL);
    console.log('Health Check Response:', response.data);
    
    return true;
  } catch (error) {
    console.error('Error with health check:', error.response ? error.response.data : error.message);
    return false;
  }
}

async function runTests() {
  const healthCheckPassed = await testHealthCheck();
  
  if (healthCheckPassed) {
    await testQuery();
  } else {
    console.log('Skipping query test due to health check failure.');
  }
}

runTests();
