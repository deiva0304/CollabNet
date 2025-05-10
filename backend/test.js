const http = require('http');

// Example JavaScript code to compile
const jsCode = `console.log("Hello, CodeRoom!");`;

// Function to run a test case
function runTest(language, code, input = undefined) {
  return new Promise((resolve, reject) => {
    // Request options
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/compile',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Prepare the payload
    const payload = {
      code: code,
      language: language
    };
    
    // Only add input if it's defined
    if (input !== undefined) {
      payload.input = input;
    }
    
    console.log(`\nTesting ${language} with${input ? '' : 'out'} input:`);
    console.log(JSON.stringify(payload, null, 2));
    
    // Make the request
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        
        try {
          const parsedData = JSON.parse(data);
          console.log('Response body:', JSON.stringify(parsedData, null, 2));
          resolve(parsedData);
        } catch (error) {
          console.error('Error parsing response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    // Write data to request body
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Run multiple test cases
async function runTests() {
  try {
    // Test JavaScript without input
    await runTest('js', jsCode);
    
    // Test JavaScript with input
    await runTest('js', `
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.on('line', (line) => {
        console.log('You entered:', line);
        rl.close();
      });
    `, 'Hello from input!');
    
    // Test Python
    await runTest('python', 'print("Hello from Python!")');
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run the tests
runTests();