// Add this test route to your Express app
app.get('/test-pinecone', async (req, res) => {
  try {
    // Direct fetch to Pinecone API to test credentials
    const response = await fetch(
      `https://controller.${process.env.PINECONE_ENVIRONMENT}.pinecone.io/actions/whoami`, 
      {
        headers: {
          'Api-Key': process.env.PINECONE_API_KEY
        }
      }
    );
    
    const data = await response.json();
    console.log('Pinecone whoami response:', data);
    
    res.json({
      status: 'success',
      pineconeResponse: data
    });
  } catch (error) {
    console.error('Error testing Pinecone connection:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
