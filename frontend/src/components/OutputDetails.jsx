import React from 'react'

const OutputDetails = ({ outputDetails }) => {
  if (!outputDetails) return null;
  
  return (
    <div className="metrics-container mt-4 flex flex-col space-y-3">
      <p className="text-sm">
        Status: <span className="font-semibold px-2 py-1 rounded-md bg-gray-100">
          {outputDetails?.status}
        </span>
      </p>
      
      {outputDetails?.memory && (
        <p className="text-sm">
          Memory: <span className="font-semibold px-2 py-1 rounded-md bg-gray-100">
            {outputDetails?.memory}
          </span>
        </p>
      )}
      
      {outputDetails?.time && (
        <p className="text-sm">
          Time: <span className="font-semibold px-2 py-1 rounded-md bg-gray-100">
            {outputDetails?.time}
          </span>
        </p>
      )}
      
      {outputDetails?.stderr && (
        <div className="text-sm">
          <p>Standard Error:</p>
          <pre className="px-2 py-1 font-normal text-xs text-red-500 bg-gray-100 rounded-md whitespace-pre-wrap">
            {outputDetails?.stderr}
          </pre>
        </div>
      )}
      
      {outputDetails?.compile_output && (
        <div className="text-sm">
          <p>Compilation Output:</p>
          <pre className="px-2 py-1 font-normal text-xs text-red-500 bg-gray-100 rounded-md whitespace-pre-wrap">
            {outputDetails?.compile_output}
          </pre>
        </div>
      )}
    </div>
  )
}

export default OutputDetails