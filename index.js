// Import required dependencies
const express = require('express');
const cors = require('cors');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
require('dotenv').config();

// Log environment variables for debugging
console.log('==== ENVIRONMENT VARIABLES CHECK ====');
console.log('PINECONE_ENVIRONMENT:', process.env.PINECONE_ENVIRONMENT ? '[SET]' : '[NOT SET]');
console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME ? '[SET]' : '[NOT SET]');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '[SET]' : '[NOT SET]');
console.log('PORT:', process.env.PORT);
console.log('====================================');

// Initialize Express app FIRST (before using it)
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client (v1.x)
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT // Add this line
});

// Connect to Pinecone and test the connection
(async function initPinecone() {
  try {
    // List indexes to verify connection
    const indexes = await pinecone.listIndexes();
    console.log('Pinecone client initialized successfully');
    console.log('Available Pinecone indexes:', indexes.map(idx => idx.name));
    
    const indexExists = indexes.some(idx => idx.name === process.env.PINECONE_INDEX_NAME);
    if (!indexExists) {
      console.warn(`Warning: Index '${process.env.PINECONE_INDEX_NAME}' not found in your Pinecone project`);
    } else {
      console.log(`Found index: ${process.env.PINECONE_INDEX_NAME}`);
    }
  } catch (error) {
    console.error('Error initializing Pinecone client:', error);
    console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME);
  }
})();

// Define routes
app.get('/', (req, res) => {
  res.send('Pinecone-ChatGPT Connector API is running');
});

// Test route to verify Pinecone credentials
app.get('/test-pinecone', async (req, res) => {
  try {
    const indexes = await pinecone.listIndexes();
    res.json({
      status: 'success',
      indexes: indexes.map(idx => idx.name)
    });
  } catch (error) {
    console.error('Error testing Pinecone connection:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
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
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });

      if (!embeddingResponse || !embeddingResponse.data[0].embedding) {
        return res.status(500).json({ error: 'Failed to generate embedding' });
      }

      const queryEmbedding = embeddingResponse.data[0].embedding;
      console.log('Generated embedding vector with length:', queryEmbedding.length);

      // Perform vector search using Pinecone (v1.x syntax)
      try {
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
        
        console.log('Querying Pinecone index:', process.env.PINECONE_INDEX_NAME);
        const searchResponse = await index.query({
          vector: queryEmbedding,
          topK: 5,
          includeMetadata: true,
          namespace: 'sunwest_bank'
        });
        
        console.log('Pinecone search completed successfully');

        // Format and return results
        const results = searchResponse.matches.map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata
        }));

        res.json({ results });
      } catch (pineconeError) {
        console.error('Error querying Pinecone:', pineconeError);
        res.status(500).json({ 
          error: 'An error occurred while querying Pinecone',
          details: pineconeError.message
        });
      }
    } catch (openaiError) {
      console.error('Error generating embedding:', openaiError);
      res.status(500).json({ 
        error: 'An error occurred while generating embedding',
        details: openaiError.message
      });
    }
  } catch (error) {
    console.error('General error processing query:', error);
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
