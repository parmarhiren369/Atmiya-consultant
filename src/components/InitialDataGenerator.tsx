import { useState } from 'react';
import { generateInitialActivityLogs } from '../utils/generateInitialActivityLogs';
import { userService } from '../services/userService';
import toast from 'react-hot-toast';

export function InitialDataGenerator() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [usersInitialized, setUsersInitialized] = useState(false);

  const handleGenerateData = async () => {
    if (generated) {
      toast.error('Initial data has already been generated!');
      return;
    }

    setLoading(true);
    try {
      // Initialize users first
      await userService.initializeUsers();
      setUsersInitialized(true);
      toast.success('User accounts initialized successfully!');
      
      // Then generate activity logs
      const result = await generateInitialActivityLogs();
      toast.success(`Successfully generated ${result.totalLogs} activity logs!`);
      setGenerated(true);
    } catch (error) {
      console.error('Error generating initial data:', error);
      toast.error('Failed to generate initial data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 mb-6 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            🚀 One-time Setup Required
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            Generate initial activity logs for your existing {29} policies and {1} deleted policy.
            This will also initialize user accounts for the system.
            This will populate the activity log with historical data.
          </p>
        </div>
        <button
          onClick={handleGenerateData}
          disabled={loading || generated}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            generated
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 cursor-not-allowed'
              : loading
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Generating...' : generated ? '✅ Generated' : 'Generate Initial Data'}
        </button>
      </div>
      {generated && (
        <div className="text-green-700 dark:text-green-300 text-sm mt-3 space-y-1">
          <p>✅ User accounts have been created!</p>
          <p>✅ Initial activity logs have been created!</p>
          <p>Refresh the page to see them.</p>
          {usersInitialized && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-400 dark:border-blue-500">
              <p className="text-blue-700 dark:text-blue-300 text-xs font-medium">Login Credentials:</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs">admin / Admin@2025</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs">prakash_jadav / Prakash@2025</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs">back_office / BackOffice@2025</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs">arun_patel / Arun@2025</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
