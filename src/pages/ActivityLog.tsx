import { useState, useEffect } from 'react';
import { usePolicies } from '../context/PolicyContext';
import { ActivityLog } from '../types';
import { 
  Clock, 
  User, 
  FileText,
  Search,
  Filter,
  Activity,
  RefreshCw,
  Calendar,
  Plus,
  Edit,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';

export function ActivityLogPage() {
  const { activityLogs, refreshActivityLogs, loading } = usePolicies();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    refreshActivityLogs();
  }, [refreshActivityLogs]);

  // Filter activity logs
  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = 
      log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = selectedAction === '' || log.action === selectedAction;
    
    return matchesSearch && matchesAction;
  });

  const getActionIcon = (action: ActivityLog['action']) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'RESTORE':
        return <RotateCcw className="h-4 w-4 text-purple-600" />;
      case 'PERMANENT_DELETE':
        return <Trash2 className="h-4 w-4 text-red-800" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getActionColor = (action: ActivityLog['action']) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'UPDATE':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      case 'RESTORE':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
      case 'PERMANENT_DELETE':
        return 'bg-red-200 dark:bg-red-900/30 text-red-900 dark:text-red-200 border-red-300 dark:border-red-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-600" />
              Activity Log
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Track all policy operations and changes
            </p>
          </div>
          <button
            onClick={refreshActivityLogs}
            className="bg-blue-600 text-white px-4 py-2 rounded-sharp hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

  {/* Initial Data Generator removed as per request */}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-sharp shadow-sm p-6 mb-6 transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by policy holder, description, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="RESTORE">Restore</option>
              <option value="PERMANENT_DELETE">Permanent Delete</option>
            </select>
          </div>

          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-2" />
            Total: {filteredLogs.length} activities
          </div>
        </div>
      </div>

      {/* Activity Log List */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-sharp shadow-sm p-8 text-center transition-colors duration-200">
            <Activity className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No activity found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || selectedAction
                ? 'Try adjusting your filters to see more results.'
                : 'Activity will appear here as policies are created, updated, or deleted.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white dark:bg-gray-800 rounded-sharp shadow-sm hover:shadow-sm transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(log.timestamp, 'PPp')}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {log.entityName}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {log.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Entity ID: {log.entityId.substring(0, 8)}...
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.userDisplayName || 'System'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {(log.oldData || log.newData) && (
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {expandedLog === log.id ? 'Hide Details' : 'Show Details'}
                    </button>
                  )}
                </div>
                
                {/* Expanded Details */}
                {expandedLog === log.id && (log.oldData || log.newData) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {log.oldData && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Old Data:</h4>
                          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-sharp">
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {JSON.stringify(log.oldData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {log.newData && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">New Data:</h4>
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-sharp">
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {JSON.stringify(log.newData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
}
