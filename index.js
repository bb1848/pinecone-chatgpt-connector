// Import required dependencies
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
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

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to generate embeddings
async function getEmbedding(text) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OpenAI API key. Please set OPENAI_API_KEY in environment variables.");
    }

    console.log("Generating embedding for query:", text);

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    console.log("OpenAI Embedding API Response:", JSON.stringify(response, null, 2)); // Debugging log

    if (!response || !response.data || !response.data.length) {
      throw new Error("Unexpected OpenAI API response format");
    }

    return response.data[0].embedding;  // ✅ Corrected parsing
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Helper function to query Pinecone
async function queryPinecone(vector, namespace = 'sunwest_bank', topK = 10) {
  try {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("Missing Pinecone API key. Please set PINECONE_API_KEY.");
    }

    // Construct the Pinecone query URL
    const url = `https://${process.env.PINECONE_INDEX_NAME}.svc.${process.env.PINECONE_ENVIRONMENT}.pinecone.io/query`;

    console.log("Querying Pinecone at URL:", url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.PINECONE_API_KEY
      },
      body: JSON.stringify({
        vector,
        topK,
        includeMetadata: true,
        namespace
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinecone API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    throw error;
  }
}

// Route to check if the server is running
app.get('/', (req, res) => {
  res.send('Pinecone-ChatGPT Connector API is running');
});

// Test route to verify Pinecone connection
app.get('/test-pinecone', async (req, res) => {
  try {
    const url = `https://${process.env.PINECONE_INDEX_NAME}.svc.${process.env.PINECONE_ENVIRONMENT}.pinecone.io/describe_index_stats`;

    console.log("Testing Pinecone connection at URL:", url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.PINECONE_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinecone API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json({
      status: 'success',
      message: 'Successfully connected to Pinecone',
      indexStats: data
    });
  } catch (error) {
    console.error("Error testing Pinecone connection:", error);
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

    console.log("Received query:", query);

    // Generate embedding for the query text using OpenAI
    try {
      const queryEmbedding = await getEmbedding(query);

      console.log("Generated embedding vector with length:", queryEmbedding.length);

      // Query Pinecone
      try {
        const searchResponse = await queryPinecone(queryEmbedding, 'sunwest_bank', 10);
        console.log("Pinecone search completed successfully");

        // Format results
        const results = searchResponse.matches.map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata
        }));

        if (results.length === 0) {
          return res.json({ message: "No relevant information found. Try rephrasing your query." });
        }

        res.json({ results });
      } catch (pineconeError) {
        console.error("Error querying Pinecone:", pineconeError);
        res.status(500).json({ 
          error: "An error occurred while querying Pinecone",
          details: pineconeError.message
        });
      }
    } catch (openaiError) {
      console.error("Error generating embedding:", openaiError);
      res.status(500).json({ 
        error: "An error occurred while generating embedding",
        details: openaiError.message
      });
    }
  } catch (error) {
    console.error("General error processing query:", error);
    res.status(500).json({ 
      error: "An error occurred while processing your query",
      details: error.message
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
