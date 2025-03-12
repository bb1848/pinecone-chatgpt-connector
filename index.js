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

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Get the index
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Pinecone API connector is running' });
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
});
