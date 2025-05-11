const express = require('express');
const cors = require('cors');
const { compileCode } = require('./compiler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // Increased limit for larger code submissions

// Compilation endpoint
app.post('/api/compile', async (req, res) => {
  try {
    const { code, language, input = '' } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ success: false, error: 'Code and language are required' });
    }
    
    const result = await compileCode(code, language, input);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Compilation error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Simple home page
app.get('/', (req, res) => {
  res.send(`
    <h1>Code Compiler Service</h1>
    <p>Use the /api/compile endpoint to compile and run code.</p>
    <p>Send a POST request with JSON body containing:</p>
    <ul>
      <li><strong>code</strong>: Source code to compile</li>
      <li><strong>language</strong>: Programming language (c, cpp, python, java, javascript, ruby, go, rust, php, latex)</li>
      <li><strong>input</strong>: (Optional) Input for the program</li>
    </ul>
  `);
});

app.listen(PORT, () => {
  console.log(`Compiler service running on port ${PORT}`);
});