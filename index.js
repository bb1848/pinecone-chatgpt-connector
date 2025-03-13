app.post('/query', async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body));
    
    // Extract query from request body, with flexible property access
    let queryText;
    if (req.body.query) {
      queryText = req.body.query;
    } else if (req.body.text) {
      queryText = req.body.text;
    } else if (req.body.question) {
      queryText = req.body.question;
    } else if (typeof req.body === 'string') {
      queryText = req.body;
    } else {
      // If no recognizable query format, return a specific error
      return res.status(400).json({
        error: 'Please provide a query string using one of these formats: {query: "your question"}, {text: "your question"}, or {question: "your question"}',
        receivedBody: req.body
      });
    }
    
    // Now proceed with the query as normal
    console.log(`Processing query: "${queryText}"`);
    
    // Generate embeddings from the query text
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: queryText,
    });
    
    const vector = embeddingResponse.data[0].embedding;
    
    // Now query Pinecone with the generated vector
    const queryResponse = await index.query({
      vector,
      namespace: 'sunwest_bank',
      topK: 10,
      includeMetadata: true
    });
    
    res.json(queryResponse);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      error: `An error occurred: ${error.message}`, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});
