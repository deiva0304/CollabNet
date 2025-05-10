import React from 'react'

const OutputWindow = ({ outputDetails }) => {
  const getOutput = () => {
    if (!outputDetails) return "Press 'Compile and Execute' to see results";
    
    const output = outputDetails.output || "";
    
    if (outputDetails.status === "error") {
      // Display an error message instead of an empty output
      return output || "Execution error. Check details below.";
    }
    
    return output;
  };

  return (
    <div className="w-full h-56 md:w-2/3 bg-[#1e293b] rounded-md text-white font-normal text-sm overflow-y-auto">
      <pre className="px-2 py-1 whitespace-pre-wrap">{getOutput()}</pre>
    </div>
  )
}

export default OutputWindow;