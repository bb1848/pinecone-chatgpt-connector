// Add this at the beginning of your index.js file to check all environment variables
console.log('==== ENVIRONMENT VARIABLES CHECK ====');
console.log('PINECONE_ENVIRONMENT:', process.env.PINECONE_ENVIRONMENT ? '[SET]' : '[NOT SET]');
console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME ? '[SET]' : '[NOT SET]');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '[SET]' : '[NOT SET]');
console.log('PORT:', process.env.PORT);
console.log('====================================');

// Also check the type of environment variables
console.log('PINECONE_ENVIRONMENT type:', typeof process.env.PINECONE_ENVIRONMENT);
console.log('PINECONE_ENVIRONMENT length:', process.env.PINECONE_ENVIRONMENT ? process.env.PINECONE_ENVIRONMENT.length : 0);
console.log('PINECONE_ENVIRONMENT first few chars:', 
  process.env.PINECONE_ENVIRONMENT ? 
  process.env.PINECONE_ENVIRONMENT.substring(0, 3) + '...' : 
  'N/A');

// Import required dependencies
const express = require('express');
const cors = require('cors');
const { PineconeClient } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
require('dotenv').config();

// Log package versions for debugging
console.log('Node.js version:', process.version);
console.log('Pinecone package:', require('@pinecone-database/pinecone/package.json').version);
console.log('OpenAI package:', require('openai/package.json').version);

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
    // Log environment variables (except API key)
    console.log('Initializing Pinecone with:');
    console.log('- Environment:', process.env.PINECONE_ENVIRONMENT);
    console.log('- Index Name:', process.env.PINECONE_INDEX_NAME);
    
    await pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT || '',
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    console.log('Pinecone client initialized successfully');
    
    // Test connection by listing indexes
    try {
      const indexList = await pinecone.listIndexes();
      console.log('Available Pinecone indexes:', indexList);
      
      if (!indexList.includes(process.env.PINECONE_INDEX_NAME)) {
        console.warn(`Warning: Index '${process.env.PINECONE_INDEX_NAME}' not found in your Pinecone project`);
      }
    } catch (listError) {
      console.error('Error listing Pinecone indexes:', listError);
    }
  } catch (error) {
    console.error('Error initializing Pinecone client:', error);
    // Additional debug info
    if (error.message && error.message.includes('Not Found')) {
      console.error('This usually indicates an incorrect environment or API key');
    }
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
