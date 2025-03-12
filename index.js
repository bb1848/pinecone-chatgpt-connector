// index.js - Main server file for Pinecone-ChatGPT connector

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Pinecone client with explicit debug logging
let pinecone;
let index;

async function initPinecone() {
  try {
    console.log("Initializing Pinecone connection...");
    console.log(`API Key present: ${!!process.env.PINECONE_API_KEY}`);
    console.log(`Index name: ${process.env.PINECONE_INDEX_NAME}`);

    // Dynamically import Pinecone to handle different versions better
    const { Pinecone } = await import('@pinecone-database/pinecone');
    
    // Create Pinecone client with minimal configuration
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    console.log("Pinecone client created successfully");
    
    // Get the index
    if (process.env.PINECONE_INDEX_NAME) {
      index = pinecone.index(process.env.PINECONE_INDEX_NAME);
      console.log("Pinecone index initialized");
      
      // Test the connection with a simple describeIndexStats
      const stats = await index.describeIndexStats();
      console.log("Successfully connected to Pinecone index");
      console.log(`Index stats: ${JSON.stringify(stats)}`);
    } else {
      console.error("PINECONE_INDEX_NAME environment variable is not set");
    }
    
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
  }
}

// Health check endpoint
app.get('/', async (req, res) => {
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
    
    console.log(`Querying Pinecone with vector of dimension ${vector.length}`);
    
    const queryResponse = await index.query({
      vector,
      topK,
      includeMetadata: true,
      includeValues: false,
      filter
    });
    
    console.log(`Query successful. Returned ${queryResponse.matches?.length || 0} matches`);
    
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

// Start the server and initialize Pinecone
app.listen(port, async () => {
  console.log(`Pinecone API connector running on port ${port}`);
  
  // Initialize Pinecone after server starts
  await initPinecone();
});
