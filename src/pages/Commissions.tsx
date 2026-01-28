import { useState, useMemo } from 'react';
import { usePolicies } from '../context/PolicyContext';
import { DollarSign, Filter, Calendar, Building2, Download, Search } from 'lucide-react';

export function Commissions() {
  const { policies } = usePolicies();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Get unique insurance companies
  const companies = useMemo(() => {
    const uniqueCompanies = Array.from(new Set(policies.map(p => p.insuranceCompany))).filter(Boolean);
    return uniqueCompanies.sort();
  }, [policies]);

  // Filter policies that have commission data
  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      // Show all policies (removed commission data requirement)
      // Users can see which policies have commission and which don't

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          policy.policyholderName?.toLowerCase().includes(search) ||
          policy.policyNumber?.toLowerCase().includes(search) ||
          policy.insuranceCompany?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Company filter
      if (selectedCompany !== 'all' && policy.insuranceCompany !== selectedCompany) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all' && policy.startDate) {
        const policyStartDate = new Date(policy.startDate);
        const today = new Date();
        
        switch (dateFilter) {
          case 'today':
            if (policyStartDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'week': {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            if (policyStartDate < weekAgo || policyStartDate > today) return false;
            break;
          }
          case 'month': {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            if (policyStartDate < monthAgo || policyStartDate > today) return false;
            break;
          }
          case 'custom':
            if (startDate && policy.startDate && new Date(policy.startDate) < new Date(startDate)) return false;
            if (endDate && policy.startDate && new Date(policy.startDate) > new Date(endDate)) return false;
            break;
        }
      }

      return true;
    });
  }, [policies, searchTerm, selectedCompany, dateFilter, startDate, endDate]);

  // Calculate total commission
  const totalCommission = useMemo(() => {
    return filteredPolicies.reduce((sum, policy) => {
      const commission = parseFloat(policy.commissionAmount || '0');
      return sum + commission;
    }, 0);
  }, [filteredPolicies]);

  const exportToCSV = () => {
    const headers = ['Policy Holder', 'Policy Number', 'Company', 'Start Date', 'End Date', 'Premium Amount', 'Commission %', 'Commission Amount'];
    const rows = filteredPolicies.map(policy => [
      policy.policyholderName,
      policy.policyNumber,
      policy.insuranceCompany,
      (policy.policyStartDate || policy.startDate) ? new Date(policy.policyStartDate || policy.startDate!).toLocaleDateString() : 'N/A',
      (policy.policyEndDate || policy.expiryDate) ? new Date(policy.policyEndDate || policy.expiryDate!).toLocaleDateString() : 'N/A',
      policy.netPremium || policy.premiumAmount || 0,
      policy.commissionPercentage || '0',
      policy.commissionAmount || '0'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="bg-emerald-700 dark:bg-gradient-to-r dark:from-green-600 dark:to-emerald-600 p-3 rounded-sharp shadow-sm">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                Commissions
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Track and manage policy commissions
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-sharp hover:bg-blue-800 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          {/* Summary Card */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-card p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Total Policies with Commission</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                    {filteredPolicies.length}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-sharp">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-card p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Total Commission Amount</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-green-400 mt-1">
                    ₹{totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-green-900/20 p-3 rounded-sharp">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-card p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 border-l-4 border-l-cyan-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Average Commission</p>
                  <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 mt-1">
                    ₹{filteredPolicies.length > 0 ? (totalCommission / filteredPolicies.length).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </p>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-sharp">
                  <DollarSign className="h-6 w-6 text-cyan-700 dark:text-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-card p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, policy number..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Company Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Building2 className="h-4 w-4 inline mr-1" />
                Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCompany('all');
                  setDateFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-sharp hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Commission Table */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Policy Holder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Policy Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Premium
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commission %
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commission Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPolicies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No commission data found</p>
                      <p className="text-sm mt-2">Try adjusting your filters or add policies with commission information</p>
                    </td>
                  </tr>
                ) : (
                  filteredPolicies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {policy.policyholderName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {policy.policyNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {policy.insuranceCompany}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {(policy.policyStartDate || policy.startDate) ? new Date(policy.policyStartDate || policy.startDate!).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {(policy.policyEndDate || policy.expiryDate) ? new Date(policy.policyEndDate || policy.expiryDate!).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ₹{parseFloat(policy.netPremium || (policy.premiumAmount && policy.premiumAmount.toString()) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          {policy.commissionPercentage || '0'}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          ₹{parseFloat(policy.commissionAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
