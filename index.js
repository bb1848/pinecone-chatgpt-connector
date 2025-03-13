// index.js - Direct implementation without Pinecone SDK

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const config = {
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeServerUrl: process.env.PINECONE_SERVER_URL || 'https://crawlnchat-7qo159o.svc.aped-4627-b74a.pinecone.io',
  pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'crawlnchat-7qo159o'
};

// Test the connection to Pinecone
async function testPineconeConnection() {
  try {
    console.log(`Testing connection to Pinecone at: ${config.pineconeServerUrl}`);
    
    const response = await axios({
      method: 'get',
      url: `${config.pineconeServerUrl}/describe_index_stats`,
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': config.pineconeApiKey
      }
    });
    
    console.log('Successfully connected to Pinecone!');
    console.log(`Index stats: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.error('Error connecting to Pinecone:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

// Health check endpoint
app.get('/', async (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Pinecone API connector is running',
    config: {
      pineconeServerUrl: config.pineconeServerUrl,
      pineconeIndexName: config.pineconeIndexName,
      pineconeApiKey: config.pineconeApiKey ? 'Set (hidden)' : 'Not set'
    }
  });
});

// Query endpoint
app.post('/query', async (req, res) => {
  try {
    const { vector, topK = 5, filter = {} } = req.body;
    
    if (!vector || !Array.isArray(vector)) {
      return res.status(400).json({ 
        error: 'Invalid request. Please provide a vector array.' 
      });
    }
    
    console.log(`Querying Pinecone with vector of dimension ${vector.length}`);
    
    const queryResponse = await axios({
      method: 'post',
      url: `${config.pineconeServerUrl}/query`,
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': config.pineconeApiKey
      },
      data: {
        vector,
        topK,
        includeMetadata: true,
        includeValues: false,
        filter
      }
    });
    
    console.log(`Query successful. Returned ${queryResponse.data.matches?.length || 0} matches`);
    
    res.json(queryResponse.data);
  } catch (error) {
    console.error('Error querying Pinecone:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      
      return res.status(error.response.status).json({
        error: 'Failed to query Pinecone database',
        details: error.response.data
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to query Pinecone database',
      details: error.message 
    });
  }
});

// Start the server
app.listen(port, async () => {
  console.log(`Pinecone API connector running on port ${port}`);
  
  // Test the connection
  await testPineconeConnection();
});
