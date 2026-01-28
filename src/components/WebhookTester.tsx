import { useState } from 'react';
import toast from 'react-hot-toast';
import { config } from '../config/webhookConfig';

interface WebhookResponse {
  status?: number | string;
  statusText?: string;
  data?: unknown;
  error?: string;
}

export function WebhookTester() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<WebhookResponse | null>(null);

  const testWebhook = async () => {
    setIsLoading(true);
    setResponse(null);

    if (!config.WEBHOOK_URL) {
      setResponse({
        error: 'Webhook URL not configured. Set VITE_N8N_WEBHOOK_URL in your .env file.',
        status: 'Configuration Error'
      });
      toast.error('❌ Webhook URL not configured');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(config.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          message: 'Testing webhook connection',
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      setResponse({
        status: response.status,
        statusText: response.statusText,
        data: data
      });

      if (response.ok) {
        toast.success('✅ Webhook is working!');
      } else {
        toast.error('❌ Webhook returned an error');
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      setResponse({
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'Network Error'
      });
      toast.error('❌ Failed to connect to webhook');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🔧 Webhook Tester</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Test your n8n webhook connection before using the AI extraction feature.
      </p>
      
      <button
        onClick={testWebhook}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Testing...
          </>
        ) : (
          'Test Webhook Connection'
        )}
      </button>

      {response && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Response:</h4>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
