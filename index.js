// Import required dependencies
const express = require('express');
const cors = require('cors');
const { PineconeClient } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client
const pinecone = new PineconeClient();

// Connect to Pinecone
(async function initPinecone() {
  try {
    await pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT,
      apiKey: process.env.PINECONE_API_KEY,
    });
    console.log('Pinecone client initialized successfully');
  } catch (error) {
    console.error('Error initializing Pinecone client:', error);
  }
})();

// Define routes
app.get('/', (req, res) => {
  res.send('Pinecone-ChatGPT Connector API is running');
});

// Main query endpoint that accepts text and performs vector search
app.post('/query', async (req, res) => {
  try {
    // Validate request
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    console.log('Received query:', query);

    // Generate embedding for the query text using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });

    if (!embeddingResponse || !embeddingResponse.data[0].embedding) {
      return res.status(500).json({ error: 'Failed to generate embedding' });
    }

    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log('Generated embedding vector with length:', queryEmbedding.length);

    // Perform vector search using Pinecone
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    
    const queryRequest = {
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
      namespace: 'sunwest_bank'
    };

    console.log('Querying Pinecone with request:', JSON.stringify(queryRequest));
    const searchResponse = await index.query({ queryRequest });
    
    console.log('Pinecone search response:', JSON.stringify(searchResponse));

    // Format and return results
    const results = searchResponse.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata
    }));

    res.json({ results });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your query',
      details: error.message
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
