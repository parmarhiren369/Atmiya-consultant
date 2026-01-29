import React, { useMemo } from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePolicies } from '../context/PolicyContext';
import { useAuth } from '../context/AuthContext';
import { Policy } from '../types';
import { AlertTriangle, Calendar, Clock, Building, MessageCircle, FileX, Eye, RefreshCw, FileText, StickyNote, Printer } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { markPolicyAsLapsed } from '../services';
import { groupHeadService } from '../services/groupHeadService';

// Helper function to safely format dates
const safeFormatDate = (dateValue: string | Date | undefined | null, formatString: string, fallback: string = 'N/A'): string => {
  if (!dateValue) return fallback;
  
  try {
    let date: Date;
    
    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return format(date, formatString);
  } catch (error) {
    console.warn('Invalid date formatting:', dateValue, error);
    return fallback;
  }
};

export function Reminders() {
  const { policies, loading, error, refreshPolicies, deletePolicy } = usePolicies();
  const { user } = useAuth();
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<(Policy & { daysRemaining: number }) | null>(null);
  const [showLapsedReasonModal, setShowLapsedReasonModal] = useState(false);
  const [lapsedReason, setLapsedReason] = useState('');
  const [policyToLapse, setPolicyToLapse] = useState<Policy | null>(null);
  const [showViewPolicyModal, setShowViewPolicyModal] = useState(false);
  const [policyToView, setPolicyToView] = useState<Policy | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [policyForNotes, setPolicyForNotes] = useState<Policy | null>(null);
  const [notes, setNotes] = useState('');
  const [printFilter, setPrintFilter] = useState<'all' | 'individual' | 'group'>('all');
  const [groupHeads, setGroupHeads] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Fetch group heads
  useEffect(() => {
    const fetchGroupHeads = async () => {
      if (!user) return;
      try {
        const heads = await groupHeadService.getGroupHeads(user.id);
        setGroupHeads(heads || []);
      } catch (error) {
        console.error('Error fetching group heads:', error);
      }
    };
    
    fetchGroupHeads();
  }, [user]);
  
  const handlePrint = () => {
    setShowPrintModal(true);
  };
  
  const handlePrintWithFilter = (filter: 'all' | 'individual' | 'group') => {
    setPrintFilter(filter);
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };
  
  const getGroupHeadName = (memberId: string) => {
    const groupHead = groupHeads.find(gh => gh.id === memberId);
    return groupHead?.groupHeadName || null;
  };
  
  // Function to view policy details
  const handleViewPolicy = (policy: Policy) => {
    setPolicyToView(policy);
    setShowViewPolicyModal(true);
  };
  
  // Function to handle renew policy
  const handleRenewPolicy = (policy: Policy) => {
    toast.success(`Redirecting to renew policy for ${policy.policyholderName}...`);
    // You can add navigation to renewal form or open renewal modal here
  };
  
  // Function to view document
  const handleViewDocument = (policy: Policy) => {
    if (policy.documentsFolderLink) {
      window.open(policy.documentsFolderLink, '_blank');
      toast.success('Opening documents folder...');
    } else {
      toast.error('No document link available for this policy');
    }
  };
  
  // Function to open notes modal
  const handleOpenNotes = (policy: Policy) => {
    setPolicyForNotes(policy);
    setNotes(policy.notes || '');
    setShowNotesModal(true);
  };
  
  // Function to save notes
  const handleSaveNotes = async () => {
    if (!policyForNotes) return;
    
    try {
      // Here you would call a service to update the policy notes
      // await updatePolicyNotes(policyForNotes.id, notes);
      toast.success('Notes saved successfully');
      setShowNotesModal(false);
      setPolicyForNotes(null);
      refreshPolicies();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };
  
  // Function to mark a policy as lapsed
  const handleMarkAsLapsed = (policy: Policy) => {
    setPolicyToLapse(policy);
    setLapsedReason('');
    setShowLapsedReasonModal(true);
  };
  
  // Function to confirm marking a policy as lapsed
  const handleConfirmLapsed = async () => {
    if (!policyToLapse) return;
    
    try {
      // Mark policy as lapsed and store in lapsed policies collection
      await markPolicyAsLapsed(policyToLapse, lapsedReason);
      
      // Delete from active policies
      await deletePolicy(policyToLapse.id);
      
      toast.success(`Policy for ${policyToLapse.policyholderName} marked as lapsed`);
      setShowLapsedReasonModal(false);
      setPolicyToLapse(null);
      refreshPolicies();
    } catch (error) {
      console.error('Error marking policy as lapsed:', error);
      toast.error('Failed to mark policy as lapsed');
    }
  };

  const expiringPolicies = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    return policies
      .filter(policy => {
        if (!policy.policyEndDate) return false;
        const expiryDate = new Date(policy.policyEndDate);
        return isAfter(expiryDate, today) && isBefore(expiryDate, thirtyDaysFromNow) && !policy.isOneTimePolicy;
      })
      .map(policy => ({
        ...policy,
        daysRemaining: policy.policyEndDate ? differenceInDays(new Date(policy.policyEndDate), today) : 0
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [policies]);

  const generateReminderMessage = (policy: Policy, daysRemaining: number) => {
    return `🔔 *Policy Renewal Reminder*

Dear ${policy.policyholderName},

Your ${policy.policyType} insurance policy is expiring soon!

📋 *Policy Details:*
• Policy Number: ${policy.policyNumber}
• Insurance Company: ${policy.insuranceCompany}
• Expiry Date: ${safeFormatDate(policy.policyEndDate, 'dd MMM yyyy')}
• Premium Amount: ₹${(policy.premiumAmount || 0).toLocaleString()}
• Days Remaining: ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}

⚠️ Please renew your policy before it expires to avoid any coverage gaps.

For assistance, contact us at OnClicks Policy Manager.

Thank you!`;
  };

  const handleSendReminder = (policy: Policy, daysRemaining: number) => {
    setSelectedPolicy({ ...policy, daysRemaining });
    setShowReminderModal(true);
  };

  const sendWhatsAppMessage = () => {
    if (!selectedPolicy) return;
    
    // Check if contact number exists
    if (!selectedPolicy.contactNo) {
      toast.error('No contact number found for this policy holder. Please add a contact number first.');
      return;
    }
    
    // Clean the phone number (remove spaces, dashes, etc.)
    let phoneNumber = selectedPolicy.contactNo.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91)
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }
    
    // Generate the message
    const message = generateReminderMessage(selectedPolicy, selectedPolicy.daysRemaining);
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    toast.success('Opening WhatsApp with pre-filled message...');
    setShowReminderModal(false);
    setSelectedPolicy(null);
  };

  const getAlertLevel = (daysRemaining: number) => {
    if (daysRemaining <= 7) return 'critical';
    if (daysRemaining <= 14) return 'warning';
    return 'info';
  };

  const getAlertStyles = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200';
    }
  };

  const getIconColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const AlertIcon = ({ level }: { level: string }) => {
    const iconClass = `h-5 w-5 ${getIconColor(level)}`;
    
    switch (level) {
      case 'critical':
        return <AlertTriangle className={iconClass} />;
      case 'warning':
        return <Clock className={iconClass} />;
      default:
        return <Calendar className={iconClass} />;
    }
  };

  const PolicyCard = ({ policy, daysRemaining }: { policy: Policy; daysRemaining: number }) => {
    const alertLevel = getAlertLevel(daysRemaining);
    const cardStyles = getAlertStyles(alertLevel);

    return (
      <div className={`rounded-sharp border-2 p-6 ${cardStyles} transition-all duration-200 hover:shadow-sm`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertIcon level={alertLevel} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {policy.policyholderName}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Building className="h-4 w-4 mr-2" />
                  <span>{policy.insuranceCompany}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Expires: {safeFormatDate(policy.policyEndDate, 'MMM dd, yyyy')}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Policy: {policy.policyType} • {policy.policyNumber}
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Premium: ₹{(policy.premiumAmount || 0).toLocaleString()}
                </div>
                {policy.contactNo && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Contact: {policy.contactNo}
                  </div>
                )}
                {policy.referenceFromName && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Reference: {policy.referenceFromName}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              alertLevel === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
              alertLevel === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
              'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
            }`}>
              {daysRemaining === 0 ? 'Expires Today' : 
               daysRemaining === 1 ? '1 day left' : 
               `${daysRemaining} days left`}
            </div>
            <div>
              <div className="flex space-x-2 flex-wrap gap-1">
                <button
                  onClick={() => handleRenewPolicy(policy)}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-sharp transition-colors duration-200"
                  title="Renew this policy"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Renew Policy
                </button>
                
                <button
                  onClick={() => handleSendReminder(policy, daysRemaining)}
                  className={`inline-flex items-center px-3 py-1 text-white text-sm rounded-sharp transition-colors duration-200 ${
                    policy.contactNo 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!policy.contactNo}
                  title={!policy.contactNo ? 'No contact number available' : 'Send WhatsApp reminder'}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Send Reminder
                </button>
                
                <button
                  onClick={() => handleViewPolicy(policy)}
                  className="inline-flex items-center px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-sharp transition-colors duration-200"
                  title="View policy details"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </button>
                
                <button
                  onClick={() => handleViewDocument(policy)}
                  className={`inline-flex items-center px-3 py-1 text-white text-sm rounded-sharp transition-colors duration-200 ${
                    policy.documentsFolderLink
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!policy.documentsFolderLink}
                  title={policy.documentsFolderLink ? 'View documents' : 'No documents available'}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View Document
                </button>
                
                <button
                  onClick={() => handleOpenNotes(policy)}
                  className="inline-flex items-center px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm rounded-sharp transition-colors duration-200"
                  title="View/Edit notes"
                >
                  <StickyNote className="h-3 w-3 mr-1" />
                  Notes
                </button>
                
                <button
                  onClick={() => handleMarkAsLapsed(policy)}
                  className="inline-flex items-center px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-sharp transition-colors duration-200"
                  title="Mark this policy as lapsed"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Mark Lapsed
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SummaryCard = ({ 
    title, 
    count, 
    icon: Icon, 
    color = 'blue',
    borderColor
  }: {
    title: string;
    count: number;
    icon: React.ElementType;
    color?: string;
    borderColor?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700'
    };

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-sharp shadow-sm p-6 border-l-4 ${borderColor || 'border-blue-500 dark:border-blue-400'} transition-colors duration-200`}>
        <div className="flex items-center">
          <div className={`p-3 rounded-sharp ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
          </div>
        </div>
      </div>
    );
  };

  const criticalCount = expiringPolicies.filter(p => p.daysRemaining <= 7).length;
  const warningCount = expiringPolicies.filter(p => p.daysRemaining > 7 && p.daysRemaining <= 14).length;
  const totalUpcoming = expiringPolicies.length;
  
  // Filter policies based on print filter
  const filteredPolicies = useMemo(() => {
    if (printFilter === 'individual') {
      return expiringPolicies.filter(p => !p.memberOf);
    } else if (printFilter === 'group') {
      return expiringPolicies.filter(p => p.memberOf);
    }
    return expiringPolicies;
  }, [expiringPolicies, printFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 printable-reminders">
        <div className="mb-8 no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">OnClicks Policy Manager - Expiry Reminders</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Stay on top of upcoming policy renewals</p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              <Link 
                to="/lapsed-policies" 
                className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-sharp shadow transition-colors duration-200"
              >
                <FileX className="h-5 w-5 mr-2" />
                View Lapsed Policies
              </Link>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sharp shadow transition-colors duration-200"
              >
                <Printer className="h-5 w-5 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading reminders...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-sharp p-6 mb-8">
            <div className="flex items-center">
              <div className="text-red-500 dark:text-red-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 dark:text-red-200 font-medium">Error loading reminders</h3>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={refreshPolicies}
                className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-sharp hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors duration-200 flex items-center"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content - Only show when not loading */}
        {!loading && (
        <>
        {/* Printable Section - Only this will print */}
        <div className="printable-reminders hidden print:block">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">Policy Expiry Reminders</h1>
            <p className="text-sm text-gray-600">
              Generated on {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Filter: {printFilter === 'all' ? 'All Policies' : printFilter === 'individual' ? 'Individual Policies Only' : 'Group Head Policies Only'}
            </p>
            {printFilter === 'group' && filteredPolicies.length > 0 && (
              <p className="text-sm font-semibold text-gray-800 mt-1">
                Group Head: {getGroupHeadName(filteredPolicies[0].memberOf!)}
              </p>
            )}
          </div>
          
          {/* Print Table */}
          {filteredPolicies.length > 0 && (
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-800 px-2 py-1 text-xs font-bold text-black text-left">Policyholder</th>
                  <th className="border border-gray-800 px-2 py-1 text-xs font-bold text-black text-left">Policy #</th>
                  <th className="border border-gray-800 px-2 py-1 text-xs font-bold text-black text-left">Type</th>
                  <th className="border border-gray-800 px-2 py-1 text-xs font-bold text-black text-left">Company</th>
                  <th className="border border-gray-800 px-2 py-1 text-xs font-bold text-black text-left">Expires</th>
                  <th className="border border-gray-800 px-2 py-1 text-xs font-bold text-black text-left">Days Left</th>
                  <th className="border border-gray-800 px-2 py-1 text-xs font-bold text-black text-right">Premium</th>
                  <th className="border border-gray-800 px-2 py-1 text-xs font-bold text-black text-left">Group Head</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id}>
                    <td className="border border-gray-400 px-2 py-1 text-xs text-black">{policy.policyholderName}</td>
                    <td className="border border-gray-400 px-2 py-1 text-xs text-black">{policy.policyNumber}</td>
                    <td className="border border-gray-400 px-2 py-1 text-xs text-black">{policy.policyType}</td>
                    <td className="border border-gray-400 px-2 py-1 text-xs text-black">{policy.insuranceCompany}</td>
                    <td className="border border-gray-400 px-2 py-1 text-xs text-black">{safeFormatDate(policy.policyEndDate, 'dd/MM/yyyy')}</td>
                    <td className="border border-gray-400 px-2 py-1 text-xs text-black">{policy.daysRemaining}</td>
                    <td className="border border-gray-400 px-2 py-1 text-xs text-black text-right">₹{(policy.premiumAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="border border-gray-400 px-2 py-1 text-xs text-black">{policy.memberOf ? getGroupHeadName(policy.memberOf) || 'N/A' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 no-print">
          <SummaryCard
            title="Critical (≤7 days)"
            count={criticalCount}
            icon={AlertTriangle}
            color="red"
            borderColor="border-red-600"
          />
          <SummaryCard
            title="Warning (8-14 days)"
            count={warningCount}
            icon={Clock}
            color="yellow"
            borderColor="border-amber-600"
          />
          <SummaryCard
            title="Upcoming (≤30 days)"
            count={totalUpcoming}
            icon={Calendar}
            color="blue"
            borderColor="border-blue-600"
          />
        </div>

        {/* Policies List */}
        <div className="bg-white dark:bg-gray-800 rounded-sharp shadow-sm transition-colors duration-200 print:shadow-none">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 no-print">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Policies Expiring Soon</h2>
            <p className="text-gray-600 dark:text-gray-300">
              {printFilter === 'all' ? 'Policies expiring in the next 30 days' :
               printFilter === 'individual' ? 'Individual policies expiring in the next 30 days' :
               'Group head policies expiring in the next 30 days'}
            </p>
          </div>

          <div className="p-6 no-print">
            {filteredPolicies.length > 0 ? (
              <div className="space-y-4">
                {filteredPolicies.map((policy) => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    daysRemaining={policy.daysRemaining}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Upcoming Renewals</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Great! No policies are expiring in the next 30 days.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Items */}
        {expiringPolicies.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-sharp shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommended Actions</h3>
            <div className="space-y-3">
              {criticalCount > 0 && (
                <div className="flex items-center p-3 bg-red-50 rounded-sharp">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                  <span className="text-red-800">
                    <strong>Urgent:</strong> {criticalCount} {criticalCount === 1 ? 'policy expires' : 'policies expire'} within 7 days. Contact your insurance agent immediately.
                  </span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center p-3 bg-yellow-50 rounded-sharp">
                  <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                  <span className="text-yellow-800">
                    <strong>Action needed:</strong> {warningCount} {warningCount === 1 ? 'policy expires' : 'policies expire'} in 8-14 days. Start the renewal process.
                  </span>
                </div>
              )}
              <div className="flex items-center p-3 bg-blue-50 rounded-sharp">
                <Calendar className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-blue-800">
                  Set up automatic renewal reminders to avoid missing future deadlines.
                </span>
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {/* Print Filter Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
            <div className="bg-white dark:bg-gray-800 rounded-card p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Printer className="h-5 w-5 mr-2 text-blue-600" />
                  Select Print Filter
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose which policies to include in the print
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => handlePrintWithFilter('all')}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-sharp font-medium transition-colors flex items-center justify-between"
                >
                  <span>Mix Print (All Policies)</span>
                  <span className="text-sm bg-blue-500 px-2 py-1 rounded">{expiringPolicies.length}</span>
                </button>
                
                <button
                  onClick={() => handlePrintWithFilter('individual')}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-sharp font-medium transition-colors flex items-center justify-between"
                >
                  <span>Only Individual Policies</span>
                  <span className="text-sm bg-green-500 px-2 py-1 rounded">
                    {expiringPolicies.filter(p => !p.member_of).length}
                  </span>
                </button>
                
                <button
                  onClick={() => handlePrintWithFilter('group')}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-sharp font-medium transition-colors flex items-center justify-between"
                >
                  <span>Only Group Head Policies</span>
                  <span className="text-sm bg-purple-500 px-2 py-1 rounded">
                    {expiringPolicies.filter(p => p.member_of).length}
                  </span>
                </button>
                
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-sharp font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reminder Modal */}
        {showReminderModal && selectedPolicy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-card max-w-2xl w-full max-h-90vh overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                  Send Reminder
                </h2>
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sharp transition-colors duration-200"
                >
                  ×
                </button>
              </div>
              
              <div className="px-6 py-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Reminder for: {selectedPolicy.policyholderName}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-gray-400">
                      Policy expires in {selectedPolicy.daysRemaining} days
                    </p>
                    {selectedPolicy.contactNo && (
                      <p className="text-gray-600 dark:text-gray-400">
                        Sending to: {selectedPolicy.contactNo}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mb-6">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message Preview:
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-sharp border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans">
                      {generateReminderMessage(selectedPolicy, selectedPolicy.daysRemaining)}
                    </pre>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={sendWhatsAppMessage}
                    className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-sharp hover:bg-green-700 transition-colors duration-200"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Send via WhatsApp
                  </button>
                  <button
                    onClick={() => setShowReminderModal(false)}
                    className="flex-1 flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-sharp hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Lapsed Reason Modal */}
        {showLapsedReasonModal && policyToLapse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-card max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                  Mark Policy as Lapsed
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Enter a reason for marking this policy as lapsed
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Policy Details
                  </label>
                  <div className="text-gray-900 dark:text-white font-medium">
                    {policyToLapse.policyholderName} - {policyToLapse.policyNumber}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {policyToLapse.insuranceCompany}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={lapsedReason}
                    onChange={(e) => setLapsedReason(e.target.value)}
                    placeholder="Why is this policy being marked as lapsed?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    rows={3}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex space-x-3">
                <button
                  onClick={() => {
                    setShowLapsedReasonModal(false);
                    setPolicyToLapse(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-sharp hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLapsed}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-sharp hover:bg-amber-700 transition-colors duration-200 font-medium"
                >
                  Mark as Lapsed
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* View Policy Modal */}
        {showViewPolicyModal && policyToView && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-card max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Policy Details - {policyToView.policyholderName}
                </h2>
              </div>
              <div className="px-6 py-4 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Policyholder Name</label>
                      <p className="text-gray-900 dark:text-white font-medium">{policyToView.policyholderName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Policy Type</label>
                      <p className="text-gray-900 dark:text-white">{policyToView.policyType}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Insurance Company</label>
                      <p className="text-gray-900 dark:text-white">{policyToView.insuranceCompany}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Policy Number</label>
                      <p className="text-gray-900 dark:text-white">{policyToView.policyNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Dates and Premium */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Dates & Premium</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</label>
                      <p className="text-gray-900 dark:text-white">{safeFormatDate(policyToView.policyStartDate || policyToView.startDate, 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Expiry Date</label>
                      <p className="text-gray-900 dark:text-white">{safeFormatDate(policyToView.policyEndDate || policyToView.expiryDate, 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Premium Amount</label>
                      <p className="text-gray-900 dark:text-white font-semibold">₹{(policyToView.premiumAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                {(policyToView.contactNo || policyToView.emailId) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {policyToView.contactNo && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Contact Number</label>
                          <p className="text-gray-900 dark:text-white">{policyToView.contactNo}</p>
                        </div>
                      )}
                      {policyToView.emailId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Email ID</label>
                          <p className="text-gray-900 dark:text-white">{policyToView.emailId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Document Links */}
                {(policyToView.documentsFolderLink || policyToView.driveFileUrl) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Document Links</h3>
                    <div className="space-y-2">
                      {policyToView.documentsFolderLink && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Documents Folder</label>
                          <a 
                            href={policyToView.documentsFolderLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                          >
                            Open Folder
                            <Eye className="h-4 w-4 ml-1" />
                          </a>
                        </div>
                      )}
                      {policyToView.driveFileUrl && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">PDF Document</label>
                          <a 
                            href={policyToView.driveFileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                          >
                            View PDF
                            <Eye className="h-4 w-4 ml-1" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {(policyToView.productType || policyToView.referenceFromName || policyToView.remark) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Additional Information</h3>
                    <div className="space-y-2">
                      {policyToView.productType && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Product Type</label>
                          <p className="text-gray-900 dark:text-white">{policyToView.productType}</p>
                        </div>
                      )}
                      {policyToView.referenceFromName && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Reference From</label>
                          <p className="text-gray-900 dark:text-white">{policyToView.referenceFromName}</p>
                        </div>
                      )}
                      {policyToView.remark && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Remarks</label>
                          <p className="text-gray-900 dark:text-white">{policyToView.remark}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => {
                    setShowViewPolicyModal(false);
                    setPolicyToView(null);
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-sharp hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Notes Modal */}
        {showNotesModal && policyForNotes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-card max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <StickyNote className="h-5 w-5 mr-2 text-pink-600 dark:text-pink-400" />
                  Notes - {policyForNotes.policyholderName}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Add or edit notes for this policy
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Policy Details
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-sharp p-3 space-y-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">Policy Number:</span> {policyForNotes.policyNumber}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">Insurance Company:</span> {policyForNotes.insuranceCompany}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">Expiry Date:</span> {safeFormatDate(policyForNotes.policyEndDate, 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this policy, reminders, or important information..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    rows={6}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Add any important notes, follow-up tasks, or reminders for this policy
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex space-x-3">
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setPolicyForNotes(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-sharp hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-sharp hover:bg-pink-700 transition-colors duration-200 font-medium"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.8cm 0.5cm;
            size: A4 landscape;
          }
          
          /* Hide everything on the page */
          body * {
            visibility: hidden !important;
          }
          
          /* Only show the printable section */
          .printable-reminders,
          .printable-reminders * {
            visibility: visible !important;
          }
          
          /* Position printable section at top of page */
          .printable-reminders {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Compact spacing for print */
          .printable-reminders h1 {
            font-size: 16px !important;
            margin: 0 !important;
            line-height: 1.3 !important;
          }
          
          .printable-reminders p {
            margin: 0 !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          
          /* Remove dark mode backgrounds */
          .printable-reminders .dark\\\\:bg-gray-800,
          .printable-reminders .dark\\\\:bg-gray-900,
          .printable-reminders .bg-gray-50 {
            background: white !important;
          }
          
          /* Table styling for print */
          .printable-reminders table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: avoid !important;
            font-size: 11px !important;
            margin-top: 8px !important;
          }
          
          .printable-reminders thead {
            display: table-header-group !important;
            background-color: #e5e7eb !important;
          }
          
          .printable-reminders tbody {
            page-break-inside: avoid !important;
          }
          
          .printable-reminders tr {
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          
          .printable-reminders th {
            background-color: #e5e7eb !important;
            font-weight: 700 !important;
            padding: 4px 6px !important;
            border: 1px solid #374151 !important;
            color: #000 !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          
          .printable-reminders td {
            padding: 3px 6px !important;
            border: 1px solid #6b7280 !important;
            color: #000 !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
        }
      `}</style>
    </div>
  );
}
