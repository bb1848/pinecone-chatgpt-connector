const express = require('express');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Pinecone client with the updated SDK approach
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// Get the index directly without using the client.Index method
const index = pinecone.Index("crawlnchat-7qo159o");

// Status endpoint
app.get('/', async (req, res) => {
  res.json({
    status: 'ok',
    message: 'Pinecone API connector is running',
    config: {
      pineconeServerUrl: 'https://crawlnchat-7qo159o.svc.aped-4627-b74a.pinecone.io',
      pineconeIndexName: 'crawlnchat-7qo159o',
      pineconeApiKey: 'Set (hidden)'
    }
  });
});

// Add endpoint to accept text queries
app.post('/query', async (req, res) => {
  try {
    const { query, namespace = 'sunwest_bank', topK = 10, includeMetadata = true } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Please provide a query string' });
    }

    // Generate embeddings from the query text
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    
    const vector = embeddingResponse.data[0].embedding;
    
    // Query Pinecone with the generated vector
    const queryResponse = await index.query({
      vector,
      namespace,
      topK,
      includeMetadata
    });
    
    res.json(queryResponse);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// Also keep the original endpoint for backwards compatibility
app.post('/query-vector', async (req, res) => {
  try {
    const { vector, namespace = 'sunwest_bank', topK = 10, includeMetadata = true } = req.body;
    
    if (!vector || !Array.isArray(vector)) {
      return res.status(400).json({ error: 'Invalid request. Please provide a vector array.' });
    }
    
    // Query Pinecone with the provided vector
    const queryResponse = await index.query({
      vector,
      namespace,
      topK,
      includeMetadata
    });
    
    res.json(queryResponse);
  } catch (error) {
    console.error('Error processing vector query:', error);
    res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
