import React, { useMemo } from 'react';
import { useState } from 'react';
import { usePolicies } from '../context/PolicyContext';
import { Policy } from '../types';
import { 
  TrendingUp, 
  Banknote, 
  Calendar, 
  FileText,
  PieChart,
  BarChart3,
  Filter,
  Building2
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { isAfter, isBefore, addMonths } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function Dashboard() {
  const { policies, loading, error, refreshPolicies } = usePolicies();
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('');
  const [selectedPolicyFilter, setSelectedPolicyFilter] = useState('');
  const [selectedLOBFilter, setSelectedLOBFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper function to map product type to Line of Business
  const getLOBFromProductType = (policy: Policy) => {
    // Check if it's a vehicle insurance (has registration number)
    if (policy.registrationNo) {
      return 'Motor Insurance';
    }
    
    // Check remark field for insurance type identification
    if (policy.remark) {
      const remarkUpper = policy.remark.toUpperCase();
      
      // Health Insurance patterns
      if (remarkUpper.includes('HEALTH') || 
          remarkUpper.includes('MEDICAL') ||
          remarkUpper.includes('FAMILY FLOATER') ||
          remarkUpper.includes('CRITICAL ILLNESS') ||
          remarkUpper.includes('MATERNITY') ||
          remarkUpper.includes('CASHLESS') ||
          remarkUpper.includes('WELLNESS') ||
          remarkUpper.includes('DENTAL') ||
          remarkUpper.includes('OPTICAL')) {
        return 'Health Insurance';
      }
      
      // Life Insurance patterns
      if (remarkUpper.includes('LIFE') || 
          remarkUpper.includes('TERM') ||
          remarkUpper.includes('WHOLE LIFE') ||
          remarkUpper.includes('ULIP') ||
          remarkUpper.includes('EDUCATION PLANNING') ||
          remarkUpper.includes('RETIREMENT') ||
          remarkUpper.includes('ACCIDENTAL DEATH')) {
        return 'Life Insurance';
      }
      
      // Fire Insurance patterns
      if (remarkUpper.includes('FIRE') ||
          remarkUpper.includes('PROPERTY') ||
          remarkUpper.includes('INDUSTRIAL') ||
          remarkUpper.includes('BUSINESS INTERRUPTION') ||
          remarkUpper.includes('BUILDING') ||
          remarkUpper.includes('ELECTRICAL EQUIPMENT') ||
          remarkUpper.includes('TERRORISM') ||
          remarkUpper.includes('CONTENTS')) {
        return 'Fire Insurance';
      }
      
      // Marine Insurance patterns
      if (remarkUpper.includes('MARINE') ||
          remarkUpper.includes('CARGO') ||
          remarkUpper.includes('IMPORT') ||
          remarkUpper.includes('EXPORT') ||
          remarkUpper.includes('TRANSIT') ||
          remarkUpper.includes('FREIGHT') ||
          remarkUpper.includes('CONTAINER') ||
          remarkUpper.includes('WAREHOUSE')) {
        return 'Marine Insurance';
      }
      
      // Liability/WC Insurance patterns
      if (remarkUpper.includes('LIABILITY') ||
          remarkUpper.includes('WORKMEN') ||
          remarkUpper.includes('COMPENSATION') ||
          remarkUpper.includes('PUBLIC LIABILITY') ||
          remarkUpper.includes('PRODUCT LIABILITY') ||
          remarkUpper.includes('WC ACT')) {
        return 'Liability Insurance';
      }
    }
    
    // Check if it has IDV field (might be property/fire insurance)
    if (policy.idv && !policy.registrationNo) {
      return 'Fire Insurance';
    }
    
    // Fallback based on productType field if available
    if (policy.productType) {
      const productTypeUpper = policy.productType.toUpperCase();
      
      if (productTypeUpper.includes('TW') || 
          productTypeUpper.includes('FOUR WHEELER') ||
          productTypeUpper.includes('GCV') ||
          productTypeUpper.includes('PCV')) {
        return 'Motor Insurance';
      }
      
      if (productTypeUpper.includes('HEALTH') ||
          productTypeUpper.includes('GHI') ||
          productTypeUpper.includes('GPA')) {
        return 'Health Insurance';
      }
      
      if (productTypeUpper.includes('FIRE')) {
        return 'Fire Insurance';
      }
      
      if (productTypeUpper.includes('MARINE')) {
        return 'Marine Insurance';
      }
      
      if (productTypeUpper.includes('LIABILITY') ||
          productTypeUpper.includes('WC')) {
        return 'Liability Insurance';
      }
      
      if (productTypeUpper.includes('LIFE')) {
        return 'Life Insurance';
      }
    }
    
    // If no pattern matches, return Miscellaneous
    return 'Miscellaneous Insurance';
  };

  // Line of Business options
  const lineOfBusinessOptions = [
    'Motor Insurance',
    'Health Insurance',
    'Life Insurance',
    'Fire Insurance',
    'Marine Insurance',
    'Liability Insurance',
    'Miscellaneous Insurance'
  ];

  // Filter policies based on selected filters
  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      const matchesCompany = !selectedCompanyFilter || policy.insuranceCompany === selectedCompanyFilter;
      const matchesPolicy = !selectedPolicyFilter || policy.policyType === selectedPolicyFilter;
      
      // LOB matching - check both productType and policyType
      const policyLOB = getLOBFromProductType(policy);
      const matchesLOB = !selectedLOBFilter || policyLOB === selectedLOBFilter;
      
      // Date filter for policy creation/start date
      let matchesDateRange = true;
      if (startDate || endDate) {
        const policyDate = new Date(policy.startDate || policy.createdAt);
        if (startDate) {
          matchesDateRange = matchesDateRange && policyDate >= new Date(startDate);
        }
        if (endDate) {
          matchesDateRange = matchesDateRange && policyDate <= new Date(endDate);
        }
      }
      
      return matchesCompany && matchesPolicy && matchesLOB && matchesDateRange;
    });
  }, [policies, selectedCompanyFilter, selectedPolicyFilter, selectedLOBFilter, startDate, endDate]);

  // Get unique companies and policy types for filters
  const companies = useMemo(() => 
    [...new Set(policies.map(p => p.insuranceCompany))].sort()
  , [policies]);

  const policyTypes = useMemo(() => 
    [...new Set(policies.map(p => p.policyType))].sort()
  , [policies]);

  // Calculate statistics based on filtered policies
  const statistics = useMemo(() => {
    const today = new Date();
    const nextMonth = addMonths(today, 1);
    
    const totalPremium = filteredPolicies.reduce((sum, policy) => sum + (policy.premiumAmount || 0), 0);
    
    const upcomingPremiums = filteredPolicies.filter(policy => {
      const expiryDate = policy.expiryDate ? new Date(policy.expiryDate) : null;
      return expiryDate && isAfter(expiryDate, today) && isBefore(expiryDate, nextMonth) && !policy.isOneTimePolicy;
    });
    
    const upcomingPremiumAmount = upcomingPremiums.reduce((sum, policy) => sum + (policy.premiumAmount || 0), 0);
    
    return {
      totalPolicies: filteredPolicies.length,
      totalPremium,
      upcomingPremiums: upcomingPremiums.length,
      upcomingPremiumAmount,
      monthlyAverage: totalPremium / 12,
      yearlyTotal: totalPremium
    };
  }, [filteredPolicies]);

  // Policy Type Distribution with interactive filtering
  const policyTypeData = useMemo(() => {
    // Get all policy types from all policies (not just filtered)
    const allTypeCount = policies.reduce((acc, policy) => {
      acc[policy.policyType] = (acc[policy.policyType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get filtered policy types
    const filteredTypeCount = filteredPolicies.reduce((acc, policy) => {
      acc[policy.policyType] = (acc[policy.policyType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const labels = Object.keys(allTypeCount);
    const colors = ['#1E40AF', '#DC2626', '#059669', '#D97706', '#0891B2', '#7C2D12'];
    
    return {
      labels,
      datasets: [{
        data: labels.map(type => allTypeCount[type]),
        backgroundColor: labels.map((type, index) => 
          filteredTypeCount[type] ? colors[index % colors.length] : '#E5E7EB'
        ),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  }, [policies, filteredPolicies]);

  // Company Revenue Distribution with interactive filtering
  const companyData = useMemo(() => {
    // Get all companies from all policies with their total premiums
    const allCompanyPremiums = policies.reduce((acc, policy) => {
      acc[policy.insuranceCompany] = (acc[policy.insuranceCompany] || 0) + (policy.premiumAmount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Get filtered companies with their premiums
    const filteredCompanyPremiums = filteredPolicies.reduce((acc, policy) => {
      acc[policy.insuranceCompany] = (acc[policy.insuranceCompany] || 0) + (policy.premiumAmount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Sort all companies by premium amount and take top 8
    const sortedCompanies = Object.entries(allCompanyPremiums)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    const colors = ['#1E40AF', '#059669', '#D97706', '#DC2626', '#0891B2', '#EA580C', '#0D9488', '#7C2D12'];
    const borderColors = ['#1E3A8A', '#047857', '#B45309', '#991B1B', '#0E7490', '#C2410C', '#115E59', '#581C0C'];

    return {
      labels: sortedCompanies.map(([company]) => company),
      datasets: [{
        label: 'Premium Amount (₹)',
        data: sortedCompanies.map(([, amount]) => amount),
        backgroundColor: sortedCompanies.map(([company], index) => 
          filteredCompanyPremiums[company] ? colors[index % colors.length] : '#E5E7EB'
        ),
        borderColor: sortedCompanies.map(([company], index) => 
          filteredCompanyPremiums[company] ? borderColors[index % borderColors.length] : '#D1D5DB'
        ),
        borderWidth: 1,
        borderRadius: 4
      }]
    };
  }, [policies, filteredPolicies]);

  // Company Revenue Distribution with interactive filtering - Bar Chart
  const companyRevenueData = useMemo(() => {
    // Get all companies from all policies with their total premiums
    const allCompanyPremiums = policies.reduce((acc, policy) => {
      acc[policy.insuranceCompany] = (acc[policy.insuranceCompany] || 0) + (policy.premiumAmount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Get filtered companies with their premiums
    const filteredCompanyPremiums = filteredPolicies.reduce((acc, policy) => {
      acc[policy.insuranceCompany] = (acc[policy.insuranceCompany] || 0) + (policy.premiumAmount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Sort companies by premium and take top 10
    const sortedCompanies = Object.entries(allCompanyPremiums)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#F43F5E', '#6366F1'];
    const borderColors = ['#059669', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#EA580C', '#65A30D', '#E11D48', '#4F46E5'];

    return {
      labels: sortedCompanies.map(([company]) => company),
      datasets: [{
        label: 'Premium Amount (₹)',
        data: sortedCompanies.map(([, amount]) => amount),
        backgroundColor: sortedCompanies.map(([company], index) => 
          filteredCompanyPremiums[company] ? colors[index % colors.length] : '#E5E7EB'
        ),
        borderColor: sortedCompanies.map(([company], index) => 
          filteredCompanyPremiums[company] ? borderColors[index % borderColors.length] : '#D1D5DB'
        ),
        borderWidth: 1,
        borderRadius: 4
      }]
    };
  }, [policies, filteredPolicies]);

  // Line of Business data with interactive filtering - Bar Chart
  const lobData = useMemo(() => {
    // Get all LOBs from all policies - use both policyType and productType for mapping
    const allLobCount = policies.reduce((acc, policy) => {
      const lob = getLOBFromProductType(policy);
      acc[lob] = (acc[lob] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Debug: Log the LOB distribution
    console.log('LOB Distribution:', allLobCount);
    console.log('Sample policies:', policies.slice(0, 3).map(p => ({
      remark: p.remark,
      registrationNo: p.registrationNo,
      idv: p.idv,
      detectedLOB: getLOBFromProductType(p)
    })));

    // Get filtered LOBs
    const filteredLobCount = filteredPolicies.reduce((acc, policy) => {
      const lob = getLOBFromProductType(policy);
      acc[lob] = (acc[lob] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const labels = Object.keys(allLobCount);
    const colors = ['#1E40AF', '#059669', '#D97706', '#DC2626', '#0891B2', '#EA580C', '#0D9488'];
    const borderColors = ['#1E3A8A', '#047857', '#B45309', '#991B1B', '#0E7490', '#C2410C', '#115E59'];
    
    return {
      labels,
      datasets: [{
        label: 'Number of Policies',
        data: labels.map(lob => allLobCount[lob]),
        backgroundColor: labels.map((lob, index) => 
          filteredLobCount[lob] ? colors[index % colors.length] : '#E5E7EB'
        ),
        borderColor: labels.map((lob, index) => 
          filteredLobCount[lob] ? borderColors[index % borderColors.length] : '#D1D5DB'
        ),
        borderWidth: 1,
        borderRadius: 4
      }]
    };
  }, [policies, filteredPolicies]);

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = 'blue',
    borderColor = 'border-blue-600'
  }: {
    icon: React.ElementType;
    title: string;
    value: string;
    subtitle?: string;
    color?: string;
    borderColor?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      green: 'bg-emerald-50 dark:bg-green-900/20 text-emerald-700 dark:text-green-400 border-emerald-200 dark:border-green-800',
      yellow: 'bg-amber-50 dark:bg-yellow-900/20 text-amber-700 dark:text-yellow-400 border-amber-200 dark:border-yellow-800',
      purple: 'bg-cyan-50 dark:bg-purple-900/20 text-cyan-700 dark:text-purple-400 border-cyan-200 dark:border-purple-800'
    };

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-card shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border-l-4 ${borderColor} border-t border-r border-b border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center">
          <div className={`p-3 rounded-sharp ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-900 py-4 sm:py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">OnClicks Policy Manager Dashboard</h1>
          <p className="text-slate-600 dark:text-gray-400 mt-2">Track your insurance portfolio and upcoming payments
            {(selectedCompanyFilter || selectedPolicyFilter || selectedLOBFilter || startDate || endDate) && (
              <span className="text-blue-700 dark:text-blue-400 font-medium"> (Filtered View)</span>
            )}
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border-2 border-slate-200 dark:border-gray-700 p-4 sm:p-6 mb-8">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-blue-700 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dashboard Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Date Range Filter */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                Policy Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
                  placeholder="End Date"
                />
              </div>
            </div>

            {/* Line of Business Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <Building2 className="inline h-4 w-4 mr-1 text-slate-500 dark:text-gray-400" />
                Line of Business
              </label>
              <select
                value={selectedLOBFilter}
                onChange={(e) => setSelectedLOBFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
              >
                <option value="">All Lines of Business</option>
                {lineOfBusinessOptions.map(lob => (
                  <option key={lob} value={lob}>{lob}</option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <Building2 className="inline h-4 w-4 mr-1 text-slate-500 dark:text-gray-400" />
                Company
              </label>
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
              >
                <option value="">All Companies</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>

            {/* Policy Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <FileText className="inline h-4 w-4 mr-1 text-slate-500 dark:text-gray-400" />
                Policy Type
              </label>
              <select
                value={selectedPolicyFilter}
                onChange={(e) => setSelectedPolicyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
              >
                <option value="">All Policy Types</option>
                {policyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCompanyFilter('');
                  setSelectedPolicyFilter('');
                  setSelectedLOBFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-sharp hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading dashboard data...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-card p-6 mb-8">
            <div className="flex items-center">
              <div className="text-red-500 dark:text-red-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading dashboard</h3>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={refreshPolicies}
                className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-sharp hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors duration-200 flex items-center font-medium"
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
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatCard
            icon={FileText}
            title="Total Policies"
            value={statistics.totalPolicies.toString()}
            subtitle="Active insurance policies"
            color="blue"
            borderColor="border-blue-600"
          />
          <StatCard
            icon={Banknote}
            title="Total Premium"
            value={`₹${statistics.totalPremium.toLocaleString()}`}
            subtitle="Annual premium amount"
            color="green"
            borderColor="border-emerald-600"
          />
          <StatCard
            icon={Calendar}
            title="Upcoming Renewals"
            value={statistics.upcomingPremiums.toString()}
            subtitle="Due this month"
            color="yellow"
            borderColor="border-amber-600"
          />
          <StatCard
            icon={TrendingUp}
            title="Monthly Average"
            value={`₹${Math.round(statistics.monthlyAverage).toLocaleString()}`}
            subtitle="Average monthly premium"
            color="purple"
            borderColor="border-cyan-600"
          />
        </div>

        {/* Charts Section */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <PieChart className="h-5 w-5 text-blue-700 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Analytics Overview</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
            Charts show all data with <span className="font-medium text-blue-700 dark:text-blue-400">colored sections</span> representing filtered data and <span className="font-medium text-gray-400 dark:text-gray-500">gray sections</span> representing filtered-out data.
          </p>
        </div>
        
        {/* First Row of Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Line of Business Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Building2 className="h-5 w-5 text-blue-700 dark:text-blue-400 mr-2" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Line of Business</h2>
            </div>
            <div className="h-64 sm:h-80">
              {policies.length > 0 ? (
                <Bar 
                  data={lobData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value} policies`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                          font: {
                            size: 12
                          }
                        }
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                          font: {
                            size: 11
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                  <div>
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">No data to display</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Policy Distribution Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <PieChart className="h-5 w-5 text-blue-700 dark:text-blue-400 mr-2" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Policy Distribution</h2>
            </div>
            <div className="h-64 sm:h-80 flex items-center justify-center">
              {policies.length > 0 ? (
                <Pie 
                  data={policyTypeData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 15,
                          usePointStyle: true,
                          font: {
                            size: 11
                          }
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} policies (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <PieChart className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">No policies to display</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Second Row of Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Company Revenue Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-5 w-5 text-emerald-700 dark:text-green-400 mr-2" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Company Revenue</h2>
            </div>
            <div className="h-64 sm:h-80">
              {policies.length > 0 ? (
                <Bar 
                  data={companyRevenueData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed.y;
                            return `${label}: ₹${value.toLocaleString()}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return '₹' + Number(value).toLocaleString();
                          },
                          font: {
                            size: 12
                          }
                        }
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                          font: {
                            size: 10
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                  <div>
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">No data to display</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Company Premium Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-5 w-5 text-blue-700 dark:text-blue-400 mr-2" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Premium by Company</h2>
            </div>
            <div className="h-64 sm:h-80">
              {policies.length > 0 ? (
                <Bar 
                  data={companyData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed.y;
                            return `${label}: ₹${value.toLocaleString()}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return '₹' + Number(value).toLocaleString();
                          },
                          font: {
                            size: 12
                          }
                        }
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                          font: {
                            size: 10
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                  <div>
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">No data to display</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly vs Yearly Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Premium Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-gray-700">
                <span className="text-slate-600 dark:text-gray-400">Monthly Average</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  ₹{Math.round(statistics.monthlyAverage).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-gray-700">
                <span className="text-slate-600 dark:text-gray-400">Yearly Total</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  ₹{statistics.yearlyTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-600 dark:text-gray-400">Upcoming This Month</span>
                <span className="text-lg font-semibold text-amber-700 dark:text-orange-400">
                  ₹{statistics.upcomingPremiumAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-gray-700">
                <span className="text-slate-600 dark:text-gray-400">Average Premium per Policy</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  ₹{filteredPolicies.length > 0 ? Math.round(statistics.totalPremium / filteredPolicies.length).toLocaleString() : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-gray-700">
                <span className="text-slate-600 dark:text-gray-400">Top Company by Revenue</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  {filteredPolicies.length > 0 ? companyData.labels[0] || 'N/A' : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-600 dark:text-gray-400">Coverage Score</span>
                <span className={`text-lg font-semibold ${statistics.upcomingPremiums > 2 ? 'text-red-600' : 'text-emerald-700 dark:text-green-600'}`}>
                  {statistics.upcomingPremiums <= 2 ? 'Good' : 'Review Needed'}
                </span>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}