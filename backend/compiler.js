/**
 * Compiles LaTeX code to PDF and returns the output as base64
 */
async function compileLaTeX(code, fileId, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.tex`);
  const pdfFile = path.join(TEMP_DIR, `${fileId}.pdf`);
  const logFile = path.join(TEMP_DIR, `${fileId}.log`);
  const auxFile = path.join(TEMP_DIR, `${fileId}.aux`);
  
  // Add files to cleanup list
  filesToCleanup.push(sourceFile);
  filesToCleanup.push(pdfFile);
  filesToCleanup.push(logFile);
  filesToCleanup.push(auxFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Compile LaTeX to PDF (run pdflatex twice to resolve references)
    const compileCommand = `cd ${TEMP_DIR} && pdflatex -interaction=nonstopmode ${fileId}.tex && pdflatex -interaction=nonstopmode ${fileId}.tex`;
    await execPromise(compileCommand);
    
    // Check if PDF was generated
    if (!fs.existsSync(pdfFile)) {
      const logContent = fs.existsSync(logFile) ? await fs.promises.readFile(logFile, 'utf8') : 'Log file not found';
      return {
        output: '',
        error: `Failed to generate PDF. LaTeX log:\n${logContent}`,
        executionTime: '---'
      };
    }
    
    // Read the PDF file as base64
    const pdfContent = await fs.promises.readFile(pdfFile);
    const base64Pdf = pdfContent.toString('base64');
    
    return {
      output: '', // No stdout for LaTeX
      pdfBase64: base64Pdf, // Return PDF as base64
      error: '',
      executionTime: '---'
    };
  } catch (error) {
    // Try to read log file for better error reporting
    let errorMsg = error.stderr || error.message;
    try {
      if (fs.existsSync(logFile)) {
        const logContent = await fs.promises.readFile(logFile, 'utf8');
        // Extract error messages from log
        const errorLines = logContent.split('\n')
          .filter(line => line.includes('Error') || line.includes('!'))
          .join('\n');
        errorMsg = errorLines || errorMsg;
      }
    } catch (logError) {
      console.error('Error reading LaTeX log:', logError);
    }
    
    return { output: '', error: errorMsg };
  }
}/**
 * Executes PHP code
 */
async function compilePhp(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.php`);
  
  // Add file to cleanup list
  filesToCleanup.push(sourceFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Execute
    const runCommand = hasInputFile ? `php ${sourceFile} < ${inputFile}` : `php ${sourceFile}`;
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
}/**
 * Compiles and runs Rust code
 */
async function compileRust(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.rs`);
  const outputFile = path.join(TEMP_DIR, fileId);
  
  // Add files to cleanup list
  filesToCleanup.push(sourceFile);
  filesToCleanup.push(outputFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Compile
    const compileCommand = `rustc -o ${outputFile} ${sourceFile}`;
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
}/**
 * Compiles and runs Go code
 */
async function compileGo(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.go`);
  const outputFile = path.join(TEMP_DIR, fileId);
  
  // Add files to cleanup list
  filesToCleanup.push(sourceFile);
  filesToCleanup.push(outputFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Compile
    const compileCommand = `go build -o ${outputFile} ${sourceFile}`;
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
}const { exec } = require('child_process');
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
      case 'ruby':
        result = await compileRuby(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      case 'go':
        result = await compileGo(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      case 'rust':
        result = await compileRust(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      case 'php':
        result = await compilePhp(code, fileId, inputFile, hasInputFile, filesToCleanup);
        break;
      case 'latex':
        result = await compileLaTeX(code, fileId, filesToCleanup);
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

/**
 * Executes Ruby code
 */
async function compileRuby(code, fileId, inputFile, hasInputFile, filesToCleanup) {
  const sourceFile = path.join(TEMP_DIR, `${fileId}.rb`);
  
  // Add file to cleanup list
  filesToCleanup.push(sourceFile);
  
  try {
    // Write code to source file
    await writeFilePromise(sourceFile, code);
    
    // Execute
    const runCommand = hasInputFile ? `ruby ${sourceFile} < ${inputFile}` : `ruby ${sourceFile}`;
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