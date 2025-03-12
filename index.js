// Pinecone initialization for direct connection to server URL

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Pinecone client
let pineconeClient;
let index;

async function initPinecone() {
  try {
    console.log("Initializing Pinecone connection...");
    
    // Import the Pinecone SDK
    const { Pinecone } = require('@pinecone-database/pinecone');
    
    // Log environment variables for debugging
    console.log("Environment variables:");
    console.log(`- PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? "[SET]" : "[NOT SET]"}`);
    console.log(`- PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME || "[NOT SET]"}`);
    console.log(`- PINECONE_SERVER_URL: ${process.env.PINECONE_SERVER_URL || "[NOT SET]"}`);
    
    // Create Pinecone client
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    // Get the index - use the actual index name from the URL
    const indexName = process.env.PINECONE_INDEX_NAME || "crawlnchat-7qo159o";
    console.log(`Connecting to index: ${indexName}`);
    
    // Try to connect to the index
    index = pineconeClient.Index(indexName);
    
    // Test connection with a simple stats query
    try {
      const stats = await index.describeIndexStats();
      console.log("Successfully connected to Pinecone!");
      console.log(`Index stats: ${JSON.stringify(stats)}`);
    } catch (statsError) {
      console.error("Error getting index stats:", statsError);
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
    pineconeConnected: !!pineconeClient,
    indexConnected: !!index,
    config: {
      index_name: process.env.PINECONE_INDEX_NAME || "crawlnchat-7qo159o",
      server_url: process.env.PINECONE_SERVER_URL || "https://crawlnchat-7qo159o.svc.aped-4627-b74a.pinecone.io"
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

// Start the server and initialize Pinecone
app.listen(port, async () => {
  console.log(`Pinecone API connector running on port ${port}`);
  
  // Initialize Pinecone after server starts
  await initPinecone();
});
