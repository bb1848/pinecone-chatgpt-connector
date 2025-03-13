const express = require('express');
const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Pinecone client
const pinecone = new PineconeClient();

pinecone.init({
  environment: 'aped-4627-b74a',
  apiKey: process.env.PINECONE_API_KEY
});

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

// Update your query endpoint to accept text and convert it to embeddings
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
    
    // Now query Pinecone with the generated vector
    const index = pinecone.Index('crawlnchat-7qo159o');
    
    const queryResponse = await index.query({
      vector,
      namespace,
      topK,
      includeMetadata
    });
    
    res.json(queryResponse);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'An error occurred while processing your query' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
