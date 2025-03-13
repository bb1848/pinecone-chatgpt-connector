app.post('/query', async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body));
    
    // Extract query from request body
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Please provide a query string',
        receivedBody: req.body
      });
    }
    
    console.log(`Processing query: "${query}"`);
    
    // Generate embeddings from the query text
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    
    const vector = embeddingResponse.data[0].embedding;
    
    // Create a proper query object for Pinecone
    // This is the format expected by the Pinecone SDK
    const queryRequest = {
      namespace: 'sunwest_bank',
      topK: 10,
      includeMetadata: true
    };
    
    // Add the vector to the query - this is critical
    queryRequest.vector = vector;
    
    // Now query Pinecone with the correctly formatted request
    const queryResponse = await index.query(queryRequest);
    
    res.json(queryResponse);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      error: `An error occurred: ${error.message}`
    });
  }
});
