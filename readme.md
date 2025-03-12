# Pinecone-ChatGPT Connector

This is a simple API server that connects your Custom GPT to a Pinecone vector database. It provides endpoints to query your vector embeddings without running anything locally.

## How It Works

1. The server provides a `/query` endpoint that accepts vector embeddings from your Custom GPT
2. It queries your Pinecone database and returns the most similar vectors with their metadata
3. Your Custom GPT can then use this information to enhance its responses

## Deployment on Render

### Step 1: Create a GitHub Repository

1. Create a new GitHub repository
2. Push these files to your repository:
   - `index.js`
   - `package.json`
   - `.env.example` (rename the provided `.env` file)
   - `README.md`

### Step 2: Set Up Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `pinecone-chatgpt-connector` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose the free plan or a paid plan based on your needs

5. Add environment variables (under "Environment" tab):
   - `PINECONE_API_KEY`: Your Pinecone API key
   - `PINECONE_INDEX_NAME`: Your Pinecone index name

6. Click "Create Web Service"

### Step 3: Test Your Deployment

Once deployed, you can test your API with:

```bash
# Health check
curl https://your-render-url.onrender.com/

# Query endpoint (replace with your actual vector)
curl -X POST https://your-render-url.onrender.com/query \
  -H "Content-Type: application/json" \
  -d '{"vector": [0.1, 0.2, 0.3, ..., 0.5]}'
```

## Setting Up Your Custom GPT

1. Create a new Custom GPT or edit an existing one
2. In the "Actions" tab, add a new action:
   - **Authentication**: None (or Basic Auth if you add it to your server)
   - **API Endpoint**: Your Render URL + `/query`
   - **Operation ID**: `queryPinecone`
   - **Description**: `Query the Pinecone vector database with embeddings to find similar content`
   - **Parameter Schema**:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Pinecone Query API",
    "version": "1.0.0"
  },
  "paths": {
    "/query": {
      "post": {
        "summary": "Query vector database",
        "operationId": "queryPinecone",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["vector"],
                "properties": {
                  "vector": {
                    "type": "array",
                    "items": {
                      "type": "number"
                    },
                    "description": "Vector embedding to search for"
                  },
                  "topK": {
                    "type": "integer",
                    "default": 5,
                    "description": "Number of results to return"
                  },
                  "filter": {
                    "type": "object",
                    "description": "Optional filter criteria"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

3. In the GPT Instructions, add details on how to use the API:

```
This GPT has access to a Pinecone vector database through a custom API.

When a user asks a question that would benefit from searching the vector database:
1. Convert the user's query into an embedding (you can use your built-in embedding capabilities)
2. Call the queryPinecone action with the embedding vector
3. Parse the results and use the returned metadata to enhance your response

The vector database contains [DESCRIBE WHAT DATA IS IN YOUR PINECONE DATABASE].
```

## Customization

You can extend this server with additional endpoints as needed, such as:
- Vector upload/indexing
- Authentication
- Filtering capabilities
- Multiple index support
