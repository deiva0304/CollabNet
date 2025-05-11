import React, { useEffect, useRef } from 'react';

const PDFViewer = ({ pdfBase64 }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (pdfBase64 && iframeRef.current) {
      const blob = base64ToBlob(pdfBase64, 'application/pdf');
      const blobUrl = URL.createObjectURL(blob);
      iframeRef.current.src = blobUrl;

      // Clean up the blob URL when component unmounts or pdfBase64 changes
      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    }
  }, [pdfBase64]);

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64, type) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type });
  };

  // Download function for PDF
  const handleDownload = () => {
    if (pdfBase64) {
      const blob = base64ToBlob(pdfBase64, 'application/pdf');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-end mb-2">
        <button 
          onClick={handleDownload}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded"
        >
          Download PDF
        </button>
      </div>
      <iframe
        ref={iframeRef}
        className="w-full h-96 border border-gray-300 rounded"
        title="PDF Output"
      />
    </div>
  );
};

export default PDFViewer;