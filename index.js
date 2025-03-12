// index.js - Main server file for Pinecone-ChatGPT connector

const express = require('express');
const cors = require('cors');
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Pinecone client - with updated configuration
let pinecone;
let index;

try {
  pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    // The environment is no longer needed in newer Pinecone versions
  });
  
  // Get the index if Pinecone is properly initialized
  if (process.env.PINECONE_INDEX_NAME) {
    index = pinecone.index(process.env.PINECONE_INDEX_NAME);
  }
} catch (error) {
  console.error('Error initializing Pinecone:', error);
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Pinecone API connector is running',
    pineconeConnected: !!pinecone,
    indexConnected: !!index,
    envVars: {
      PINECONE_API_KEY: process.env.PINECONE_API_KEY ? 'Set (hidden)' : 'Not set',
      PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'Not set'
    }
  });
});

// Query endpoint
app.post('/query', async (req, res) => {
  try {
    if (!index) {
      return res.status(503).json({ 
        error: 'Pinecone connection not initialized',
        details: 'Please check your environment variables and server logs'
      });
    }
    
    const { vector, topK = 5, filter = {} } = req.body;
    
    if (!vector || !Array.isArray(vector)) {
      return res.status(400).json({ 
        error: 'Invalid request. Please provide a vector array.' 
      });
    }
    
    const queryResponse = await index.query({
      vector,
      topK,
      includeMetadata: true,
      includeValues: false,
      filter
    });
    
    res.json(queryResponse);
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    res.status(500).json({ 
      error: 'Failed to query Pinecone database',
      details: error.message 
    });
  }
});

// Optional namespace list endpoint
app.get('/namespaces', async (req, res) => {
  try {
    if (!index) {
      return res.status(503).json({ 
        error: 'Pinecone connection not initialized',
        details: 'Please check your environment variables and server logs'
      });
    }
    
    const describeIndexStatsResponse = await index.describeIndexStats();
    res.json(describeIndexStatsResponse.namespaces || {});
  } catch (error) {
    console.error('Error getting namespaces:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve namespaces',
      details: error.message 
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Pinecone API connector running on port ${port}`);
  console.log(`Pinecone client initialized: ${!!pinecone}`);
  console.log(`Pinecone index connected: ${!!index}`);
  console.log(`Environment variables set:
    - PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? 'Yes (hidden)' : 'No'}
    - PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME || 'No'}`);
});
