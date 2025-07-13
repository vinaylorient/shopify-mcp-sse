# Shopify MCP SSE Server

SSE (Server-Sent Events) endpoint for Shopify MCP integration with n8n.

## Features

- 🚀 Express.js server with MCP client integration
- 📡 SSE endpoint for n8n MCP Client consumption
- 🔧 RESTful API endpoints for Shopify operations
- ⚡ Built-in rate limiting and error handling
- 🌐 CORS configured for n8n access

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Server will be available at:**
   - SSE Endpoint: `http://localhost:3000/mcp`
   - Health Check: `http://localhost:3000/health`
   - API: `http://localhost:3000/api`

## Deployment to Render

1. Push this repository to GitHub/GitLab
2. Connect to Render.com
3. Deploy as a Web Service
4. Use the provided SSE endpoint in n8n MCP Client

## Environment Variables

```
NODE_ENV=production
PORT=10000
```

## API Endpoints

- `GET /health` - Health check
- `GET /mcp` - SSE endpoint for n8n
- `GET /api/tools` - List available MCP tools
- `POST /api/execute` - Execute MCP tools
- `POST /api/shopify/products` - Get Shopify products
- `POST /api/shopify/update-product-image` - Update product image alt text

## License

MIT