// Simplified Shopify MCP SSE Server for n8n Integration
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for n8n access
app.use(cors({
  origin: [
    'https://lorienthaus.app.n8n.cloud',
    'http://localhost:5678',
    'https://app.n8n.cloud'
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'shopify-mcp-sse-simple',
    endpoints: {
      health: '/health',
      sse: '/mcp',
      api: '/api'
    }
  });
});

// SSE endpoint for n8n MCP Client
app.get('/mcp', async (req, res) => {
  console.log('📡 New SSE connection established');
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {}
      },
      serverInfo: {
        name: "shopify-mcp-sse",
        version: "1.0.0"
      }
    }
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    console.log('📡 SSE connection closed');
  });

  // Keep connection alive with pings
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/ping",
      params: {
        timestamp: new Date().toISOString()
      }
    })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// API endpoint to list available tools (mock for now)
app.get('/api/tools', async (req, res) => {
  res.json({
    success: true,
    tools: [
      {
        name: "get_products",
        description: "Retrieve products from the Shopify store",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", default: 50 }
          }
        }
      },
      {
        name: "update_product_image", 
        description: "Update product image alt text",
        inputSchema: {
          type: "object",
          properties: {
            product_id: { type: "number" },
            image_id: { type: "number" },
            alt: { type: "string" }
          },
          required: ["product_id", "image_id", "alt"]
        }
      }
    ]
  });
});

// Mock API endpoint to execute tools
app.post('/api/execute', async (req, res) => {
  try {
    const { tool, arguments: args = {} } = req.body;
    
    if (!tool) {
      return res.status(400).json({
        success: false,
        error: 'Tool name is required'
      });
    }

    console.log(`🔧 Mock executing tool: ${tool}`, args);
    
    // Mock responses for testing
    let mockResult;
    switch (tool) {
      case 'get_products':
        mockResult = {
          products: [
            {
              id: 12345,
              title: "Test Product",
              images: [
                { id: 67890, alt: null, position: 1 }
              ]
            }
          ]
        };
        break;
      case 'update_product_image':
        mockResult = {
          image: {
            id: args.image_id,
            alt: args.alt,
            updated_at: new Date().toISOString()
          }
        };
        break;
      default:
        mockResult = { message: `Tool ${tool} executed successfully` };
    }
    
    res.json({
      success: true,
      tool,
      arguments: args,
      result: mockResult,
      timestamp: new Date().toISOString(),
      note: "This is a mock response for testing"
    });

  } catch (error) {
    console.error('Error executing tool:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tool: req.body.tool
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Shopify MCP SSE Server running on port ${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/mcp`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
  console.log(`💊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;