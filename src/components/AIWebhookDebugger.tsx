import { useState } from 'react';
import { getWebhookUrl, debugLog, config } from '../config/webhookConfig';
import toast from 'react-hot-toast';

interface TestResponse {
  test: string;
  response: Record<string, unknown>;
  timestamp: string;
}

export function AIWebhookDebugger() {
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<TestResponse[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const addResponse = (test: string, response: Record<string, unknown>) => {
    setResponses(prev => [...prev, { test, response, timestamp: new Date().toISOString() }]);
  };

  const clearResponses = () => {
    setResponses([]);
  };

  const testBasicConnection = async () => {
    setIsLoading(true);
    try {
      debugLog('Testing basic connection...');
      
      const response = await fetch(getWebhookUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: 'basic_connection',
          message: 'Testing basic webhook connectivity',
          timestamp: new Date().toISOString()
        })
      });

      const data = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };

      addResponse('Basic Connection Test', data);
      
      if (response.ok) {
        toast.success('✅ Basic connection successful!');
      } else {
        toast.error(`❌ Basic connection failed: ${response.status}`);
      }
    } catch (error) {
      addResponse('Basic Connection Test', { error: error instanceof Error ? error.message : 'Unknown error' });
      toast.error('❌ Basic connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testFormDataUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsLoading(true);
    try {
      debugLog('Testing FormData upload...');
      
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('fileName', selectedFile.name);
      formData.append('fileSize', selectedFile.size.toString());
      formData.append('test', 'formdata_upload');
      formData.append('timestamp', new Date().toISOString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.TIMEOUT_MS);

      const response = await fetch(getWebhookUrl(), {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };

      addResponse('FormData Upload Test', data);
      
      if (response.ok) {
        toast.success('✅ FormData upload successful!');
      } else {
        toast.error(`❌ FormData upload failed: ${response.status}`);
      }
    } catch (error) {
      addResponse('FormData Upload Test', { error: error instanceof Error ? error.message : 'Unknown error' });
      toast.error('❌ FormData upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      debugLog('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">🔧 AI Webhook Debugger</h2>
      
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Configuration</h3>
        <pre className="text-sm text-blue-800 dark:text-blue-200 overflow-auto">
          {JSON.stringify({
            webhookUrl: getWebhookUrl(),
            timeout: config.TIMEOUT_MS,
            maxFileSize: `${config.MAX_FILE_SIZE / 1024 / 1024}MB`,
            supportedTypes: config.SUPPORTED_FILE_TYPES
          }, null, 2)}
        </pre>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={testBasicConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '⏳ Testing...' : '🔌 Test Basic Connection'}
        </button>

        <button
          onClick={testFormDataUpload}
          disabled={isLoading || !selectedFile}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '⏳ Testing...' : '📤 Test File Upload'}
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Test File (PDF):
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test Results</h3>
          <button
            onClick={clearResponses}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-400"
          >
            Clear Results
          </button>
        </div>
        
        {responses.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">No test results yet. Run a test to see the results.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-auto">
            {responses.map((result, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{result.test}</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{result.timestamp}</span>
                </div>
                <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(result.response, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="font-semibold text-yellow-900 mb-2">💡 Debugging Tips</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Check the browser's Network tab to see the actual HTTP request</li>
          <li>• Verify your n8n workflow is active and running</li>
          <li>• Ensure your n8n instance allows CORS from your domain</li>
          <li>• Check n8n execution logs for any errors</li>
          <li>• Test with a small PDF file first (under 1MB)</li>
        </ul>
      </div>
    </div>
  );
}
