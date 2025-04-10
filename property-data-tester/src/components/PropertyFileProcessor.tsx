import React, { useState } from 'react';
import axios from 'axios';

interface ProcessingStats {
  processedCount: number;
  processingTime: number;
  stuckFiles: number;
}

const PropertyFileProcessor: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [limit, setLimit] = useState(10);
  const [cleanup, setCleanup] = useState(false);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessFiles = async () => {
    setIsProcessing(true);
    setError(null);
    setStats(null);
    
    try {
      const response = await axios.post('/api/property-files/process', {
        limit,
        cleanup
      });
      
      setStats(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing files');
      console.error('Error processing files:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card p-4 mb-4">
      <h2 className="text-xl font-bold mb-4">Process Property Files</h2>
      
      <div className="mb-4">
        <label className="block mb-2">
          Number of files to process:
          <input
            type="number"
            min="1"
            max="100"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
            className="ml-2 p-1 border rounded"
            disabled={isProcessing}
          />
        </label>
      </div>
      
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={cleanup}
            onChange={(e) => setCleanup(e.target.checked)}
            className="mr-2"
            disabled={isProcessing}
          />
          Clean up old files (older than 1 month)
        </label>
      </div>
      
      <button
        onClick={handleProcessFiles}
        disabled={isProcessing}
        className={`px-4 py-2 rounded ${isProcessing ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
      >
        {isProcessing ? 'Processing...' : 'Process Files'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {stats && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
          <h3 className="font-bold mb-2">Processing Results:</h3>
          <ul>
            <li>Files processed: {stats.processedCount}</li>
            <li>Processing time: {stats.processingTime.toFixed(2)} seconds</li>
            <li>Stuck files: {stats.stuckFiles}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PropertyFileProcessor;