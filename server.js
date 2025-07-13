// Shopify MCP SSE Server for n8n Integration
// Deploy this to Render.com to create an SSE endpoint for your Shopify MCP

const express = require('express');
const cors = require('cors');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');

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

// Initialize MCP Client for Shopify
class ShopifyMCPService {
  constructor() {
    this.client = null;
    this.transport = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Initialize the MCP transport and client
      this.transport = new SSEServerTransport('/mcp', {
        timeout: 30000
      });
      
      this.client = new Client({
        name: "shopify-mcp-n8n",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {},
          resources: {}
        }
      });

      await this.client.connect(this.transport);
      this.isConnected = true;
      
      console.log('✅ Shopify MCP Client connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MCP client:', error);
      this.isConnected = false;
      return false;
    }
  }

  async listTools() {
    if (!this.isConnected) {
      throw new Error('MCP client not connected');
    }
    
    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      console.error('Error listing tools:', error);
      throw error;
    }
  }

  async callTool(name, arguments_ = {}) {
    if (!this.isConnected) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: arguments_
      });
      return response;
    } catch (error) {
      console.error(`Error calling tool ${name}:`, error);
      throw error;
    }
  }
}

// Initialize the MCP service
const shopifyMCP = new ShopifyMCPService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mcpConnected: shopifyMCP.isConnected,
    service: 'shopify-mcp-sse'
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
    type: 'connection',
    status: 'connected',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    console.log('📡 SSE connection closed');
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// API endpoint to list available Shopify tools
app.get('/api/tools', async (req, res) => {
  try {
    if (!shopifyMCP.isConnected) {
      await shopifyMCP.initialize();
    }

    const tools = await shopifyMCP.listTools();
    
    res.json({
      success: true,
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to execute Shopify MCP tools
app.post('/api/execute', async (req, res) => {
  try {
    const { tool, arguments: args = {} } = req.body;
    
    if (!tool) {
      return res.status(400).json({
        success: false,
        error: 'Tool name is required'
      });
    }

    if (!shopifyMCP.isConnected) {
      await shopifyMCP.initialize();
    }

    console.log(`🔧 Executing tool: ${tool}`, args);
    
    const result = await shopifyMCP.callTool(tool, args);
    
    res.json({
      success: true,
      tool,
      arguments: args,
      result: result.content || result,
      timestamp: new Date().toISOString()
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

// Specific Shopify endpoints for common operations
app.post('/api/shopify/products', async (req, res) => {
  try {
    const { limit = 50, page_info } = req.body;
    
    const result = await shopifyMCP.callTool('get_products', {
      limit,
      ...(page_info && { page_info })
    });
    
    res.json({
      success: true,
      data: result.content || result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/shopify/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await shopifyMCP.callTool('get_product', { id: parseInt(id) });
    
    res.json({
      success: true,
      data: result.content || result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/shopify/update-product-image', async (req, res) => {
  try {
    const { product_id, image_id, alt, position } = req.body;
    
    const result = await shopifyMCP.callTool('update_product_image', {
      product_id: parseInt(product_id),
      image_id: parseInt(image_id),
      ...(alt && { alt }),
      ...(position && { position: parseInt(position) })
    });
    
    res.json({
      success: true,
      data: result.content || result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize MCP connection on startup
async function startup() {
  console.log('🚀 Starting Shopify MCP SSE Server...');
  
  try {
    await shopifyMCP.initialize();
    console.log('✅ MCP client initialized successfully');
  } catch (error) {
    console.warn('⚠️ MCP client initialization failed, will retry on first request');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Shopify MCP SSE Server running on port ${PORT}`);
    console.log(`📡 SSE endpoint: http://localhost:${PORT}/mcp`);
    console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
    console.log(`💊 Health check: http://localhost:${PORT}/health`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  if (shopifyMCP.client) {
    try {
      await shopifyMCP.client.close();
      console.log('✅ MCP client closed');
    } catch (error) {
      console.error('Error closing MCP client:', error);
    }
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  
  if (shopifyMCP.client) {
    try {
      await shopifyMCP.client.close();
      console.log('✅ MCP client closed');
    } catch (error) {
      console.error('Error closing MCP client:', error);
    }
  }
  
  process.exit(0);
});

// Start the server
startup().catch(error => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});

module.exports = app;