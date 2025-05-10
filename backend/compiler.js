const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const util = require('util');

const execPromise = util.promisify(exec);
const writeFilePromise = util.promisify(fs.writeFile);
const unlinkPromise = util.promisify(fs.unlink);

const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Compiles and executes code
 * @param {string} code - Source code to compile and run
 * @param {string} language - Programming language
 * @param {string} input - Input for the program
 * @returns {Object} - Compilation and execution results
 */
async function compileCode(code, language, input = '') {
  // Generate unique filenames for this compilation
  const fileId = uuidv4();
  const inputFile = path.join(TEMP_DIR, `input_${fileId}.txt`);
  
  // Files to clean up
  const filesToCleanup = [];
  
  try {
    // Write input to file if provided and not empty
    let hasInputFile = false;
    if (input && input.trim() !== '') {
      await writeFilePromise(inputFile, input);
      filesToCleanup.push(inputFile);
      hasInputFile = true;
    }

    // Language-specific compilation and execution
    let result;
    switch (language.toLowerCase()) {
      case 'c':
        result = await compileC(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      case 'c++':
      case 'cpp':
        result = await compileCpp(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      case 'python':
        result = await compilePython(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      case 'java':
        result = await compileJava(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      case 'javascript':
      case 'js':
        result = await compileJavaScript(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
    
    return result;
  } catch (error) {
    if (error.stderr) {
      return { output: '', error: error.stderr };
    }
    throw error;
  } finally {
    // Clean up all temporary files
    for (const file of filesToCleanup) {
      if (fs.existsSync(file)) {
        try {
          await unlinkPromise(file);
        } catch (err) {
          console.error(`Failed to delete file ${file}:`, err);
        }
      }
    }
  }
}

/**
 * Compiles and runs C code
 */
async function compileC(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.c`);
  const outputFile = path.join(TEMP_DIR, fileId);
  
  // Add files to cleanup list
  filesToCleanup.push(sourceFile);
  filesToCleanup.push(outputFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Compile
    const compileCommand = `gcc ${sourceFile} -o ${outputFile}`;
    await execPromise(compileCommand);
    
    // Execute
    const runCommand = hasInputFile ? `${outputFile} < ${inputFile}` : outputFile;
    const { stdout, stderr } = await execPromise(runCommand, { timeout: 5000 });
    
    return {
      output: stdout,
      error: stderr,
      executionTime: '---' // Could add timing logic here
    };
  } catch (error) {
    if (error.stderr) {
      return { output: '', error: error.stderr };
    }
    throw error;
  }
}

/**
 * Compiles and runs C++ code
 */
async function compileCpp(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.cpp`);
  const outputFile = path.join(TEMP_DIR, fileId);
  
  // Add files to cleanup list
  filesToCleanup.push(sourceFile);
  filesToCleanup.push(outputFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Compile
    const compileCommand = `g++ ${sourceFile} -o ${outputFile}`;
    await execPromise(compileCommand);
    
    // Execute
    const runCommand = hasInputFile ? `${outputFile} < ${inputFile}` : outputFile;
    const { stdout, stderr } = await execPromise(runCommand, { timeout: 5000 });
    
    return {
      output: stdout,
      error: stderr,
      executionTime: '---'
    };
  } catch (error) {
    if (error.stderr) {
      return { output: '', error: error.stderr };
    }
    throw error;
  }
}

/**
 * Compiles and runs Python code
 */
async function compilePython(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.py`);
  
  // Add file to cleanup list
  filesToCleanup.push(sourceFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Execute
    const runCommand = hasInputFile ? `python3 ${sourceFile} < ${inputFile}` : `python3 ${sourceFile}`;
    const { stdout, stderr } = await execPromise(runCommand, { timeout: 5000 });
    
    return {
      output: stdout,
      error: stderr,
      executionTime: '---'
    };
  } catch (error) {
    if (error.stderr) {
      return { output: '', error: error.stderr };
    }
    throw error;
  }
}

/**
 * Compiles and runs Java code
 */
async function compileJava(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  // Extract class name from Java code
  const classNameMatch = code.match(/public\s+class\s+(\w+)/);
  if (!classNameMatch) {
    throw new Error('Could not find public class name in Java code');
  }
  
  const className = classNameMatch[1];
  const sourceFile = path.join(TEMP_DIR, `${className}.java`);
  const classFile = path.join(TEMP_DIR, `${className}.class`);
  
  // Add files to cleanup list
  filesToCleanup.push(sourceFile);
  filesToCleanup.push(classFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Compile
    const compileCommand = `javac ${sourceFile}`;
    await execPromise(compileCommand);
    
    // Execute
    const runCommand = hasInputFile 
      ? `cd ${TEMP_DIR} && java ${className} < ${path.basename(inputFile)}` 
      : `cd ${TEMP_DIR} && java ${className}`;
    
    const { stdout, stderr } = await execPromise(runCommand, { timeout: 5000 });
    
    return {
      output: stdout,
      error: stderr,
      executionTime: '---'
    };
  } catch (error) {
    if (error.stderr) {
      return { output: '', error: error.stderr };
    }
    throw error;
  }
}

/**
 * Executes JavaScript code
 */
async function compileJavaScript(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.js`);
  
  // Add file to cleanup list
  filesToCleanup.push(sourceFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Execute
    const runCommand = hasInputFile ? `node ${sourceFile} < ${inputFile}` : `node ${sourceFile}`;
    const { stdout, stderr } = await execPromise(runCommand, { timeout: 5000 });
    
    return {
      output: stdout,
      error: stderr,
      executionTime: '---'
    };
  } catch (error) {
    if (error.stderr) {
      return { output: '', error: error.stderr };
    }
    throw error;
  }
}

module.exports = { compileCode };