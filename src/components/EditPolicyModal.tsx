import { useState } from 'react';
import { Policy } from '../types';
import { X, Save, Calendar, User, FileText, DollarSign, Phone, Car, Hash, ExternalLink, Link, CheckCircle, AlertCircle } from 'lucide-react';

interface EditPolicyModalProps {
  policy: Policy;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPolicy: Partial<Policy>) => Promise<void>;
}

export function EditPolicyModal({ policy, isOpen, onClose, onSave }: EditPolicyModalProps) {
  const [formData, setFormData] = useState<Partial<Policy>>({
    policyholderName: policy.policyholderName,
    policyType: policy.policyType,
    insuranceCompany: policy.insuranceCompany,
    policyNumber: policy.policyNumber,
    startDate: policy.startDate,
    expiryDate: policy.expiryDate,
    premiumAmount: policy.premiumAmount,
    businessType: policy.businessType || 'New',
    contactNo: policy.contactNo || '',
    emailId: policy.emailId || '',
    registrationNo: policy.registrationNo || '',
    engineNo: policy.engineNo || '',
    chasisNo: policy.chasisNo || '',
    hp: policy.hp || '',
    riskLocationAddress: policy.riskLocationAddress || '',
    idv: policy.idv || '',
    netPremium: policy.netPremium || '',
    gst: policy.gst || '',
    totalPremium: policy.totalPremium || '',
    remark: policy.remark || '',
    productType: policy.productType || '',
    referenceFromName: policy.referenceFromName || '',
    isOneTimePolicy: policy.isOneTimePolicy || false,
    ncbPercentage: policy.ncbPercentage || '',
    isRenewed: policy.isRenewed || false,
    lastClaimDate: policy.lastClaimDate || '',
    lastClaimAmount: policy.lastClaimAmount || '',
    hasClaimLastYear: policy.hasClaimLastYear || false,
    documentsFolderLink: policy.documentsFolderLink || '',
    driveFileUrl: policy.driveFileUrl || '',
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'premiumAmount') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Only send changed fields
      const changedFields: Record<string, unknown> = {};
      (Object.keys(formData) as Array<keyof Policy>).forEach(key => {
        if (formData[key] !== policy[key]) {
          changedFields[key] = formData[key];
        }
      });

      if (Object.keys(changedFields).length > 0) {
        await onSave(changedFields as Partial<Policy>);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error saving policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Edit Policy - {policy.policyholderName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Policyholder Name *
                  </label>
                  <input
                    type="text"
                    name="policyholderName"
                    value={formData.policyholderName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Policy Type *
                  </label>
                  <select
                    name="policyType"
                    value={formData.policyType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Policy Type</option>
                    <option value="Life">Life Insurance</option>
                    <option value="Health">Health Insurance</option>
                    <option value="Vehicle">Vehicle Insurance</option>
                    <option value="Motor">Motor Insurance</option>
                    <option value="Property">Property Insurance</option>
                    <option value="Fire">Fire Insurance</option>
                    <option value="Marine">Marine Insurance</option>
                    <option value="Travel">Travel Insurance</option>
                    <option value="Liability">Liability Insurance</option>
                    <option value="Engineering">Engineering Insurance</option>
                    <option value="Agriculture">Agriculture Insurance</option>
                    <option value="Credit">Credit Insurance</option>
                    <option value="Miscellaneous">Miscellaneous Insurance</option>
                    <option value="General">General Insurance</option>
                    <option value="TW">Two Wheeler</option>
                    <option value="FOUR WHEELER">Four Wheeler</option>
                    <option value="MISC">Miscellaneous</option>
                    <option value="GCV">Goods Carrying Vehicle</option>
                    <option value="PCV">Passenger Carrying Vehicle</option>
                    <option value="GHI">Group Health Insurance</option>
                    <option value="GPA">Group Personal Accident</option>
                    <option value="WC">Workmen's Compensation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business Type *
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Business Type</option>
                    <option value="New">New</option>
                    <option value="Renewal">Renewal</option>
                    <option value="Rollover">Rollover</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Insurance Company *
                  </label>
                  <input
                    type="text"
                    name="insuranceCompany"
                    value={formData.insuranceCompany}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Policy Number *
                  </label>
                  <input
                    type="text"
                    name="policyNumber"
                    value={formData.policyNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Dates and Premium */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                Dates & Premium
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Premium Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="number"
                      name="premiumAmount"
                      value={formData.premiumAmount}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email ID
                  </label>
                  <input
                    type="email"
                    name="emailId"
                    value={formData.emailId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Specific Fields (show only for Vehicle insurance) */}
            {formData.policyType === 'Vehicle' && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Car className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                  Vehicle Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      name="registrationNo"
                      value={formData.registrationNo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Engine Number
                    </label>
                    <input
                      type="text"
                      name="engineNo"
                      value={formData.engineNo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Chassis Number
                    </label>
                    <input
                      type="text"
                      name="chasisNo"
                      value={formData.chasisNo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Horse Power (HP)
                    </label>
                    <input
                      type="text"
                      name="hp"
                      value={formData.hp}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      IDV (Insured Declared Value)
                    </label>
                    <input
                      type="text"
                      name="idv"
                      value={formData.idv}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      NCB Percentage
                    </label>
                    <input
                      type="text"
                      name="ncbPercentage"
                      value={formData.ncbPercentage}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Risk Location Address
                    </label>
                    <input
                      type="text"
                      name="riskLocationAddress"
                      value={formData.riskLocationAddress}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Vehicle checkboxes */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isOneTimePolicy"
                      checked={formData.isOneTimePolicy}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      One Time Policy
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isRenewed"
                      checked={formData.isRenewed}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Renewed Policy
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="hasClaimLastYear"
                      checked={formData.hasClaimLastYear}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Had Claim Last Year
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Hash className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Type
                  </label>
                  <input
                    type="text"
                    name="productType"
                    value={formData.productType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reference From
                  </label>
                  <input
                    type="text"
                    name="referenceFromName"
                    value={formData.referenceFromName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Remarks
                  </label>
                  <textarea
                    name="remark"
                    value={formData.remark}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Document Links */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <ExternalLink className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Document Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Documents Folder Link
                    {formData.documentsFolderLink ? (
                      <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      name="documentsFolderLink"
                      value={formData.documentsFolderLink}
                      onChange={handleInputChange}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                        formData.documentsFolderLink 
                          ? 'border-green-300 dark:border-green-600' 
                          : 'border-red-300 dark:border-red-600'
                      }`}
                    />
                    {formData.documentsFolderLink && (
                      <button
                        type="button"
                        onClick={() => window.open(formData.documentsFolderLink, '_blank')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700"
                      >
                        <Link className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Google Drive folder link for client documents
                  </p>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PDF Document Link
                    {formData.driveFileUrl ? (
                      <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      name="driveFileUrl"
                      value={formData.driveFileUrl}
                      onChange={handleInputChange}
                      placeholder="https://drive.google.com/file/d/..."
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                        formData.driveFileUrl 
                          ? 'border-green-300 dark:border-green-600' 
                          : 'border-red-300 dark:border-red-600'
                      }`}
                    />
                    {formData.driveFileUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(formData.driveFileUrl, '_blank')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700"
                      >
                        <Link className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Direct link to policy PDF document
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
