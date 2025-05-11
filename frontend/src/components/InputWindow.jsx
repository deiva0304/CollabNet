import React from 'react';

const InputWindow = ({ setInput }) => {
  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  return (
    <div className="flex flex-col w-full h-full">
      <h1 className="text-white font-bold text-xl mb-2 flex items-center">
        <span className="mr-2">Input</span>
        <span className="text-sm font-normal text-gray-400">(Provide test input for your program)</span>
      </h1>
      <div className="flex-1 w-full rounded-md shadow-md overflow-hidden">
        <textarea 
          aria-label="Input Window"
          className="w-full h-full p-3 bg-[#1e1e1e] text-white font-mono border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          placeholder="Enter your program's input here..."
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};

export default InputWindow;