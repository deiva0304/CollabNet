const express = require('express');
const cors = require('cors');
const { compileCode } = require('./compiler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Compiler service running on port ${PORT}`);
});