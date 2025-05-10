import { React, useState } from 'react';
import axios from 'axios';

const currStatus = ['Running', 'Running.', 'Running..', ' Running...'];
const regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

function CompileButton({ content, langauge, input, setOutput }) {
  
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('Compile and Execute');

    let intervalId;
    var statusChange = 0;

    function hasNonLatin1Characters(str) {
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            if (charCode > 255) {
                return true;
            }
        }
        return false;
    }

    function statusUpdate() {
        if (statusChange === 0) {
            setStatus(currStatus[0]);
            statusChange++;
        } else if (statusChange === 1) {
            statusChange++;
            setStatus(currStatus[1]);
        } else if (statusChange === 2) {
            statusChange++;
            setStatus(currStatus[2]);
        } else {
            statusChange = 0;
            setStatus(currStatus[3]);
        }
    }

    function startInterval() {
        intervalId = setInterval(statusUpdate, 300);
    }
    
    function stopInterval() {
        clearInterval(intervalId);
        setStatus('Compile and Execute');
    }

    // Map language IDs from dropdown to your custom compiler's supported languages
    function mapLanguageId(languageId) {
        // Map the language options to your compiler's supported languages
        const languageMap = {
            'cpp': 'cpp',
            'cpp14': 'cpp',
            'cpp17': 'cpp',
            'c': 'c',
            'python': 'python',
            'python2': 'python',
            'python3': 'python',
            'java': 'java'
        };
        
        return languageMap[languageId] || null;
    }

    async function compileCode() {
        setProcessing(true);
        var sourceCode = content.current.getValue().replace(regex, '');

        if(!sourceCode || hasNonLatin1Characters(sourceCode)) {
            alert('Cannot compile. Code editor either contains special characters or is empty.');
            setProcessing(false);
            return;
        }

        // Map the language ID to one supported by your custom compiler
        const mappedLanguage = mapLanguageId(langauge.id);
        
        if (!mappedLanguage) {
            alert(`Language ${langauge.value} is not supported by the custom compiler. Only C++, Java, Python, and C are supported.`);
            setProcessing(false);
            return;
        }

        startInterval();
        
        // Create the request payload for your custom compiler API
        const requestPayload = {
            language: mappedLanguage,
            code: sourceCode,
            input: input || undefined
        };
        
        // Log what we're sending to help debug
        console.log("Sending to API:", requestPayload);
        
        try {
            // Use axios to call your custom compiler API
            const response = await axios.post(
                'http://localhost:5000/api/compile', // Update with your actual API URL
                requestPayload,
                {
                    headers: {
                        'content-type': 'application/json'
                    }
                }
            );
            
            console.log("API Response:", response.data);
            
            // Format the output to match what your frontend expects
            const formattedOutput = {
                status: response.data.success ? 'success' : 'error',
                output: response.data.output || '',
                memory: response.data.memory || '0',
                time: response.data.time || '0',
                stderr: response.data.stderr || '',
                compile_output: response.data.compile_output || ''
            };
            
            setOutput(formattedOutput);
        } catch (err) {
            console.error("API Error:", err);
            
            // Better error handling with more details
            let errorMessage;
            if (err.response) {
                // The request was made and the server responded with an error status
                console.log("Error response data:", err.response.data);
                console.log("Error response status:", err.response.status);
                console.log("Error response headers:", err.response.headers);
                errorMessage = {
                    status: 'error',
                    output: err.response.data?.message || JSON.stringify(err.response.data),
                    stderr: err.response.data?.stderr || 'Error occurred during compilation/execution'
                };
            } else if (err.request) {
                // The request was made but no response was received
                console.log("Error request:", err.request);
                errorMessage = {
                    status: 'error',
                    output: "No response received from the server. Please check your compiler service is running.",
                    stderr: "Network error - couldn't connect to compilation service"
                };
            } else {
                // Something happened in setting up the request
                console.log("Error message:", err.message);
                errorMessage = {
                    status: 'error',
                    output: err.message,
                    stderr: "Request configuration error"
                };
            }
            
            setOutput(errorMessage);
        } finally {
            setProcessing(false);
            stopInterval();
        }
    }

    return (
        <button 
            aria-label="Compile Button" 
            className="flex justify-center items-center w-52 mr-1 relative px-5 py-1 overflow-hidden border border-black rounded group" 
            disabled={processing} 
            onClick={compileCode}
        >
            <span className="absolute top-0 left-0 w-0 h-0 transition-all duration-200 border-t-2 border-gray-600 group-hover:w-full ease"></span>
            <span className="absolute bottom-0 right-0 w-0 h-0 transition-all duration-200 border-b-2 border-gray-600 group-hover:w-full ease"></span>
            <span className="absolute top-0 left-0 w-full h-0 transition-all duration-300 delay-200 bg-gray-600 group-hover:h-full ease"></span>
            <span className="absolute bottom-0 left-0 w-full h-0 transition-all duration-300 delay-200 bg-gray-600 group-hover:h-full ease"></span>
            <span className="absolute inset-0 w-full h-full duration-300 delay-300 bg-gray-900 opacity-0 group-hover:opacity-100"></span>
            <span className="relative transition-colors duration-300 delay-200 group-hover:text-white ease">{status}</span>
        </button>
    );
}

export default CompileButton;