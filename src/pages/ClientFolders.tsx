import { useState, useEffect, useCallback } from 'react';
import { Search, Folder, FileText, FolderOpen, Upload, X, Download, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClientFolders } from '../services/clientFolderService';
import { storageService } from '../services/storageService';
import toast from 'react-hot-toast';

interface ClientFolder {
  id: string;
  policyholderName: string;
  policyNumber: string;
  policyType: string;
  insuranceCompany: string;
  documentCount: number;
  driveFileUrl?: string;
  documentsFolderLink?: string;
}

export function ClientFolders() {
  const { user, effectiveUserId } = useAuth();
  const [clientFolders, setClientFolders] = useState<ClientFolder[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<ClientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithDocuments, setOnlyWithDocuments] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<ClientFolder | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Array<{
    name: string;
    path: string;
    url: string;
  }>>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const loadClientFolders = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const folders = await getClientFolders(user.id);
      setClientFolders(folders);
    } catch (error) {
      console.error('Error loading client folders:', error);
      toast.error('Failed to load client folders');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const filterFolders = useCallback(() => {
    let filtered = [...clientFolders];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (folder) =>
          folder.policyholderName.toLowerCase().includes(query) ||
          folder.policyNumber.toLowerCase().includes(query) ||
          folder.policyType.toLowerCase().includes(query) ||
          folder.insuranceCompany.toLowerCase().includes(query)
      );
    }

    // Filter by documents
    if (onlyWithDocuments) {
      filtered = filtered.filter((folder) => folder.documentCount > 0);
    }

    setFilteredFolders(filtered);
  }, [searchQuery, onlyWithDocuments, clientFolders]);

  useEffect(() => {
    loadClientFolders();
  }, [loadClientFolders]);

  useEffect(() => {
    filterFolders();
  }, [filterFolders]);

  const handleOpenUploadModal = (folder: ClientFolder) => {
    setSelectedFolder(folder);
    setUploadFiles([]);
    setUploadModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!effectiveUserId || !selectedFolder || uploadFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      const results = await storageService.uploadMultipleClientDocuments(
        uploadFiles,
        effectiveUserId,
        selectedFolder.policyholderName, // Customer name
        selectedFolder.policyNumber // Policy number for uniqueness
      );

      const successCount = results.filter((r): r is { name: string; url: string; path: string } => r !== null).length;
      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} file(s)`);
        setUploadModalOpen(false);
        setUploadFiles([]);
        setSelectedFolder(null);
        // Reload folders to update document count
        loadClientFolders();
      } else {
        toast.error('Failed to upload files');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocuments = async (folder: ClientFolder) => {
    if (!effectiveUserId) return;

    setSelectedFolder(folder);
    setViewModalOpen(true);
    setLoadingDocuments(true);

    try {
      const files = await storageService.listUserFiles(
        effectiveUserId, 
        'client-documents',
        folder.policyholderName, // Customer name
        folder.policyNumber // Policy number for uniqueness
      );
      setDocuments(files);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteDocument = async (filePath: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await storageService.deleteClientDocument(filePath);
      toast.success('Document deleted successfully');
      // Reload documents for this specific customer
      if (selectedFolder && effectiveUserId) {
        const files = await storageService.listUserFiles(
          effectiveUserId, 
          'client-documents',
          selectedFolder.policyholderName,
          selectedFolder.policyNumber
        );
        setDocuments(files);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileText className="h-5 w-5 text-blue-600" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Client Folders</h1>
            <p className="text-slate-600 dark:text-gray-400 mt-1">
              Browse and access client documents
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
              {filteredFolders.length} clients
            </span>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithDocuments}
                onChange={(e) => setOnlyWithDocuments(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                Only with documents
              </span>
            </label>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by client name, policy number, type, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sharp text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* Client Folders Grid */}
      {filteredFolders.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="mx-auto h-16 w-16 text-slate-300 dark:text-gray-600" />
          <p className="mt-4 text-lg text-slate-600 dark:text-gray-400">
            {searchQuery || onlyWithDocuments ? 'No clients found' : 'No client folders available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              className="bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 rounded-sharp p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
            >
              {/* Header with Folder Icon */}
              <div className="flex items-start space-x-3 mb-4">
                <div className="bg-white/20 p-2 rounded-sharp">
                  <Folder className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">{folder.policyholderName}</h3>
                  <p className="text-sm text-white/80 truncate">
                    {folder.policyType} - {folder.insuranceCompany}
                  </p>
                </div>
              </div>

              {/* Policy Details */}
              <div className="bg-black/10 rounded-sharp p-4 mb-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70">Policy #:</span>
                  <span className="font-medium">{folder.policyNumber}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70">Documents:</span>
                  <span className="font-medium">
                    {folder.documentCount > 0 ? folder.documentCount : 'No documents available'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => handleViewDocuments(folder)}
                  className="w-full flex items-center justify-center space-x-2 bg-white/90 hover:bg-white text-blue-600 backdrop-blur-sm px-4 py-2 rounded-sharp text-sm font-medium transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Documents</span>
                </button>
                <button
                  onClick={() => handleOpenUploadModal(folder)}
                  className="w-full flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-sharp text-sm font-medium transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Documents</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && selectedFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-sharp shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Upload Documents
                </h2>
                <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
                  Upload documents for {selectedFolder.policyholderName}
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFiles([]);
                  setSelectedFolder(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Select Files
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-sharp p-8 text-center hover:border-blue-500 dark:hover:border-blue-600 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 text-slate-400 dark:text-gray-500 mb-3" />
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-500">
                      PDF, JPG, PNG, DOC, DOCX (max 10MB per file)
                    </p>
                  </label>
                </div>
              </div>

              {/* Selected Files List */}
              {uploadFiles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Selected Files ({uploadFiles.length})
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-sharp"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors ml-3"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFiles([]);
                  setSelectedFolder(null);
                }}
                className="px-4 py-2 text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sharp transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || uploading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-sharp disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload {uploadFiles.length} file(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Documents Modal */}
      {viewModalOpen && selectedFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-sharp shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Documents - {selectedFolder.policyholderName}
                </h2>
                <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
                  {documents.length} document(s) available
                </p>
              </div>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedFolder(null);
                  setDocuments([]);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 dark:border-blue-400"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-16 w-16 text-slate-300 dark:text-gray-600" />
                  <p className="mt-4 text-lg text-slate-600 dark:text-gray-400">
                    No documents uploaded yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-sharp hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {getFileIcon(doc.name)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {doc.name.replace(/^\d+_/, '')}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">
                            Document
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => window.open(doc.url, '_blank')}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-sharp transition-colors"
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc.url, doc.name)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-sharp transition-colors"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.path)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-sharp transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedFolder(null);
                  setDocuments([]);
                }}
                className="px-4 py-2 text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sharp transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
