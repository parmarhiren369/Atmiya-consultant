import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePolicies } from '../context/PolicyContext';
import { useAuth } from '../context/AuthContext';
import { PolicyFormData, AIExtractedData, Policy } from '../types';
import { FileText, User, Save, ArrowLeft, Upload, Sparkles, ToggleLeft, ToggleRight, Lock, X, ChevronDown } from 'lucide-react';
import { getWebhookUrl, debugLog, config } from '../config/webhookConfig';
import { storageService } from '../services/storageService';
import toast from 'react-hot-toast';

// Configuration constants
const MAX_FILES_LIMIT = 10; // Limit to prevent AI overloading

// Insurance Companies List
const INSURANCE_COMPANIES = [
  'Life Insurance Corporation of India',
  'Axis Max Life Insurance Limited',
  'HDFC Life Insurance Company Limited',
  'ICICI Prudential Life Insurance Co. Ltd.',
  'Kotak Mahindra Life Insurance Co. Ltd.',
  'IndiaFirst Life Insurance Company Ltd.',
  'Edelweiss Tokio Life Insurance Company Limited',
  'Aegon Life Insurance Co. Ltd.',
  'Aviva Life Insurance Co. India Ltd.',
  'Bajaj Allianz Life Insurance Co. Ltd.',
  'Bharti AXA Life Insurance Co. Ltd.',
  'Canara HSBC Oriental Bank of Commerce Life Insurance Co. Ltd.',
  'IDBI Federal Life Insurance Company Limited',
  'PNB MetLife India Insurance Co. Ltd.',
  'Pramerica Life Insurance Co. Ltd.',
  'Reliance Nippon Life Insurance Company',
  'Sahara India Life Insurance Co. Ltd.',
  'SBI Life Insurance Co. Ltd.',
  'Shriram Life Insurance Company Ltd.',
  'Star Union Dai-ichi Life Insurance Co. Ltd.',
  'Tata AIA Life Insurance Co. Ltd.',
  'Acko General Insurance Ltd.',
  'Agriculture Insurance Company of India Ltd.',
  'Bajaj Allianz General Insurance Co. Ltd.',
  'Cholamandalam MS General Insurance Co. Ltd.',
  'ECGC Ltd. (formerly Export Credit Guarantee Corp.)',
  'Future Generali India Insurance Co. Ltd.',
  'Go Digit General Insurance Ltd.',
  'HDFC ERGO General Insurance Co. Ltd.',
  'ICICI Lombard General Insurance Co. Ltd.',
  'IFFCO-TOKIO General Insurance Co. Ltd.',
  'National Insurance Company Ltd.',
  'New India Assurance Co. Ltd.',
  'Reliance General Insurance Co. Ltd.',
  'Royal Sundaram General Insurance Co. Ltd.',
  'SBI General Insurance Co. Ltd.',
  'Tata AIG General Insurance Co. Ltd.',
  'United India Insurance Company Ltd.',
  'Universal Sompo General Insurance Co. Ltd.',
  'Liberty General Insurance Ltd.',
  'Magma HDI General Insurance Co. Ltd.',
  'Raheja QBE General Insurance Co. Ltd.',
  'Shriram General Insurance Co. Ltd.',
  'Navi General Insurance Ltd.',
  'Zuno General Insurance Ltd. (formerly Edelweiss General)',
  'Kotak Mahindra General Insurance Co. Ltd.',
  'Aditya Birla Health Insurance Co. Ltd.',
  'Care Health Insurance Ltd. (formerly Religare Health)',
  'Galaxy Health Insurance Company Limited (formerly Galaxy Health & Allied)',
  'Narayana Health Insurance Ltd.',
  'Manipal Cigna Health Insurance Company Limited',
  'Niva Bupa Health Insurance Co. Ltd.',
];

export function AddPolicy() {
  const navigate = useNavigate();
  const { addPolicy, policies } = usePolicies();
  const { user, effectiveUserId } = useAuth();
  const [formData, setFormData] = useState<PolicyFormData>({
    policyholderName: '',
    policyType: 'General',
    insuranceCompany: '',
    policyNumber: '',
    startDate: '',
    expiryDate: '',
    premiumAmount: '',
    pdfFile: undefined,
    pdfFileName: '',
    fileId: '',
    driveFileUrl: '',
    pdfLink: '',
    documentsFolderLink: '',
    contactNo: '',
    emailId: '',
    registrationNo: '',
    engineNo: '',
    chasisNo: '',
    hp: '',
    riskLocationAddress: '',
    idv: '',
    netPremium: '',
    odPremium: '',
    thirdPartyPremium: '',
    gst: '',
    totalPremium: '',
    commissionPercentage: '',
    commissionAmount: '',
    remark: '',
    referenceFromName: '',
    isOneTimePolicy: false,
    ncbPercentage: '',
    businessType: 'New',
    memberOf: ''
  });

  const [productType, setProductType] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Insurance company autocomplete states
  const [showInsuranceDropdown, setShowInsuranceDropdown] = useState(false);
  const [filteredInsuranceCompanies, setFilteredInsuranceCompanies] = useState<string[]>([]);

  // Product type autocomplete states
  const [showProductTypeDropdown, setShowProductTypeDropdown] = useState(false);
  const [filteredProductTypes, setFilteredProductTypes] = useState<string[]>([]);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedPDFs, setUploadedPDFs] = useState<Array<{ file: File; url: string; path: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Client documents drag and drop states
  const [isClientDocsDragging, setIsClientDocsDragging] = useState(false);
  const [uploadedClientDocs, setUploadedClientDocs] = useState<Array<{ file: File; url: string; path: string }>>([]);
  const [isClientDocsUploading, setIsClientDocsUploading] = useState(false);

  // Multi-file sequential processing states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [isMultiFileMode, setIsMultiFileMode] = useState(false);

  // Group Heads state for Member Of dropdown
  const [groupHeads, setGroupHeads] = useState<Array<{id: string, name: string}>>([]);
  const [isLoadingGroupHeads, setIsLoadingGroupHeads] = useState(true);
  

  // Fetch group heads on component mount
  useEffect(() => {
    const fetchGroupHeads = async () => {
      try {
        setIsLoadingGroupHeads(true);
        const { groupHeadService } = await import('../services/groupHeadService');
        const heads = await groupHeadService.getGroupHeads(user!.id);
        setGroupHeads(heads.map(gh => ({ id: gh.id, name: gh.groupHeadName })));
      } catch (error) {
        console.error('Error fetching group heads:', error);
        toast.error('Failed to load group heads for Member Of dropdown');
      } finally {
        setIsLoadingGroupHeads(false);
      }
    };

    if (user) {
      fetchGroupHeads();
    }
  }, [user]);

  // Initialize Firebase storage on mount
  useEffect(() => {
    const initStorage = async () => {
      await storageService.initializeBucket();
    };
    initStorage();
  }, []);

  // Close insurance company dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#insuranceCompany') && !target.closest('.insurance-dropdown')) {
        setShowInsuranceDropdown(false);
      }
      if (!target.closest('#productType') && !target.closest('.product-type-dropdown')) {
        setShowProductTypeDropdown(false);
      }
    };

    if (showInsuranceDropdown || showProductTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInsuranceDropdown, showProductTypeDropdown]);

  // Monitor form data changes for debugging
  useEffect(() => {
    debugLog('🔄 Form data state changed:', formData);
    debugLog('🔄 Policyholder name in state:', formData.policyholderName);
  }, [formData]);

  // Force re-render when form data changes
  useEffect(() => {
    if (formData.policyholderName) {
      debugLog('🔄 Policyholder name detected, forcing re-render');
      // This will trigger a re-render
    }
  }, [formData.policyholderName]);

  // All Product Types - Flat list for searchable autocomplete
  const PRODUCT_TYPES = [
    'Term Insurance',
    'Whole Life Insurance',
    'Endowment Plan',
    'Money Back Policy',
    'Unit Linked Insurance Plan (ULIP)',
    'Child Education Plan',
    'Child Marriage Plan',
    'Retirement Plan',
    'Pension Plan',
    'Annuity Plan',
    'Guaranteed Return Plan',
    'Savings Insurance Plan',
    'Investment Linked Insurance Plan',
    'Group Life Insurance',
    'Credit Life Insurance',
    'Loan Protection Insurance',
    'Micro Insurance',
    'Keyman Insurance',
    'Individual Health Insurance',
    'Family Floater Health Insurance',
    'Senior Citizen Health Insurance',
    'Group Health Insurance',
    'Critical Illness Insurance',
    'Top-Up Health Insurance',
    'Super Top-Up Health Insurance',
    'Hospital Cash Plan',
    'OPD Insurance',
    'Maternity Insurance',
    'Personal Accident Insurance',
    'Disability Insurance',
    'Two-Wheeler Insurance',
    'Private Car Insurance',
    'Commercial Vehicle Insurance',
    'Third Party Motor Insurance',
    'Comprehensive Motor Insurance',
    'Standalone Own Damage Motor Insurance',
    'Home Insurance',
    'House Structure Insurance',
    'Home Contents Insurance',
    'Rented Home Insurance',
    'Fire Insurance',
    'Property Insurance',
    'Factory Insurance',
    'Shop Insurance',
    'Office Insurance',
    'Warehouse Insurance',
    'Travel Insurance',
    'Domestic Travel Insurance',
    'International Travel Insurance',
    'Student Travel Insurance',
    'Senior Citizen Travel Insurance',
    'Corporate Travel Insurance',
    'Marine Cargo Insurance',
    'Marine Hull Insurance',
    'Export Import Insurance',
    'Business Insurance',
    'SME Insurance',
    'Shopkeeper Insurance',
    'Startup Insurance',
    'Professional Indemnity Insurance',
    'Cyber Insurance',
    'Directors & Officers (D&O) Insurance',
    'Public Liability Insurance',
    'Product Liability Insurance',
    'Workmen Compensation Insurance',
    'Employee Insurance',
    'Crop Insurance',
    'Weather Insurance',
    'Livestock Insurance',
    'Poultry Insurance',
    'Gadget Insurance',
    'Mobile Insurance',
    'Laptop Insurance',
    'Electronics Insurance',
    'Pet Insurance',
    'Event Insurance',
    'Wedding Insurance',
    'Fidelity Guarantee Insurance',
    'Engineering Insurance',
    'Contractor All Risk Insurance',
    'Erection All Risk Insurance',
  ];

  // Enhanced adaptive auto-fill function for any PDF format
  // This function can handle various insurance companies and policy formats
  const autoFillFormFromN8nData = (n8nResponse: Record<string, unknown> | Array<Record<string, unknown>>) => {
    debugLog('🔄 Auto-filling form from n8n response:', n8nResponse);
    
    // Handle the specific n8n output format: [{ "output": { ... } }] - similar to popup.js
    let extractedData;
    
    if (Array.isArray(n8nResponse) && n8nResponse.length > 0 && n8nResponse[0].output) {
      // n8n format: [{ "output": { data } }]
      extractedData = n8nResponse[0].output;
      debugLog('📦 Extracted data from array format:', extractedData);
    } else if (!Array.isArray(n8nResponse) && n8nResponse.output) {
      // Alternative format: { "output": { data } }
      extractedData = n8nResponse.output;
      debugLog('📦 Extracted data from object format:', extractedData);
    } else if (!Array.isArray(n8nResponse) && n8nResponse.data) {
      // Format: { "data": { data } }
      extractedData = n8nResponse.data;
      debugLog('📦 Extracted data from data property:', extractedData);
    } else {
      // Direct format: { data }
      extractedData = n8nResponse;
      debugLog('📦 Using direct response format:', extractedData);
    }

    // Validate that we have actual data
    if (!extractedData || typeof extractedData !== 'object') {
      debugLog('❌ No valid data found in n8n response');
      toast.error('No valid data found in response');
      return;
    }

    // Cast to Record for easier access
    const dataRecord = extractedData as Record<string, unknown>;
    
    // Comprehensive field mapping with extensive variations for different PDF formats
    const extractField = (possibleKeys: string[]): string => {
      for (const key of possibleKeys) {
        const value = dataRecord[key];
        if (value && String(value).trim()) {
          return String(value).trim();
        }
      }
      return '';
    };
    
    // Extract data with comprehensive field name variations for any insurance format
    const mappedData = {
      // Policyholder Name - supports various formats
      policyholderName: extractField([
        'policyholderName', 'policyholder_name', 'name', 'customer_name', 'insured_name',
        'client_name', 'policy_holder', 'holder_name', 'customer', 'insured',
        'Name', 'CUSTOMER NAME', 'POLICY HOLDER NAME', 'INSURED NAME'
      ]),
      
      // Policy Number - comprehensive variations
      policyNumber: extractField([
        'policyNumber', 'policy_number', 'policyNo', 'policy_no', 'policy_id',
        'contract_number', 'certificate_number', 'document_number', 'uin_no',
        'Policy No', 'POLICY NUMBER', 'UIN No', 'Certificate No'
      ]),
      
      // Insurance Company - all possible variations
      insuranceCompany: extractField([
        'insuranceCompany', 'insurance_company', 'company', 'insurer', 'company_name',
        'provider', 'insurance_provider', 'underwriter', 'issuer',
        'Company', 'INSURANCE COMPANY', 'COMPANY NAME', 'INSURER'
      ]),
      
      // Start Date - various date field names
      startDate: extractField([
        'startDate', 'start_date', 'fromDate', 'from_date', 'effectiveDate', 'effective_date',
        'policy_start', 'inception_date', 'commencement_date', 'valid_from',
        'From', 'FROM DATE', 'EFFECTIVE FROM', 'POLICY START DATE'
      ]),
      
      // Expiry Date - comprehensive date variations
      expiryDate: extractField([
        'expiryDate', 'expiry_date', 'toDate', 'to_date', 'maturityDate', 'maturity_date',
        'policy_end', 'expiration_date', 'valid_till', 'end_date', 'renewal_date',
        'To', 'TO DATE', 'EXPIRY DATE', 'POLICY END DATE', 'VALID TILL'
      ]),
      
      // Premium Amount - all premium field variations
      premiumAmount: extractField([
        'premiumAmount', 'premium_amount', 'premium', 'total_premium', 'totalPremium',
        'basic_premium', 'annual_premium', 'policy_premium', 'gross_premium',
        'Premium', 'PREMIUM AMOUNT', 'TOTAL PREMIUM', 'ANNUAL PREMIUM'
      ]),
      
      // Total Premium (including taxes)
      totalPremium: extractField([
        'totalPremium', 'total_premium', 'final_premium', 'payable_premium',
        'grand_total', 'amount_payable', 'total_amount', 'net_payable',
        'Total Premium', 'TOTAL PAYABLE', 'FINAL AMOUNT'
      ]),
      
      // Net Premium (before taxes)
      netPremium: extractField([
        'netPremium', 'net_premium', 'basic_premium', 'base_premium',
        'premium_before_tax', 'core_premium', 'Net Premium', 'BASE PREMIUM'
      ]),
      
      // GST/Tax Amount
      gst: extractField([
        'gst', 'tax', 'gst_amount', 'tax_amount', 'service_tax', 'vat',
        'igst', 'cgst', 'sgst', 'total_tax', 'GST', 'TAX AMOUNT', 'SERVICE TAX'
      ]),
      
      // Contact Information
      contactNo: extractField([
        'contactNo', 'contact_no', 'phone', 'mobile', 'mobile_no', 'phone_number',
        'contact_number', 'cell_phone', 'telephone', 'Mobile', 'MOBILE NO', 'CONTACT'
      ]),
      
      emailId: extractField([
        'emailId', 'email_id', 'email', 'email_address', 'contact_email',
        'Email', 'EMAIL ID', 'EMAIL ADDRESS'
      ]),
      
      // Vehicle Registration Number
      registrationNo: extractField([
        'registrationNo', 'registration_no', 'vehicle_no', 'reg_no', 'vehicle_number',
        'registration_number', 'car_number', 'vehicle_registration', 'rto_number',
        'Vehicle Registration No', 'REG NO', 'VEHICLE NUMBER'
      ]),
      
      // Engine Number
      engineNo: extractField([
        'engineNo', 'engine_no', 'engine_number', 'engine_id',
        'Engine No', 'ENGINE NUMBER', 'ENGINE NO'
      ]),
      
      // Chassis Number
      chasisNo: extractField([
        'chasisNo', 'chasis_no', 'chassis_no', 'chassis_number', 'vin',
        'vehicle_identification_number', 'frame_number',
        'Chassis No', 'CHASSIS NUMBER', 'VIN', 'FRAME NO'
      ]),
      
      // Horsepower
      hp: extractField([
        'hp', 'horsepower', 'engine_power', 'power', 'bhp', 'kw',
        'HP', 'HORSEPOWER', 'POWER', 'BHP'
      ]),
      
      // Insured Declared Value
      idv: extractField([
        'idv', 'insured_declared_value', 'vehicle_value', 'market_value',
        'declared_value', 'sum_insured', 'coverage_amount',
        'IDV', 'INSURED DECLARED VALUE', 'VEHICLE VALUE', 'SUM INSURED'
      ]),
      
      // No Claim Bonus
      ncbPercentage: extractField([
        'ncbPercentage', 'ncb_percentage', 'ncb', 'no_claim_bonus',
        'bonus_percentage', 'discount_percentage', 'ncb_discount',
        'NCB', 'NO CLAIM BONUS', 'BONUS %', 'DISCOUNT %'
      ]),
      
      // Risk Location/Address
      riskLocationAddress: extractField([
        'riskLocationAddress', 'risk_location_address', 'address', 'location',
        'registered_address', 'risk_address', 'vehicle_location', 'garaging_address',
        'Address', 'RISK LOCATION', 'REGISTERED ADDRESS'
      ]),
      
      // Additional fields
      remark: extractField([
        'remark', 'remarks', 'notes', 'comments', 'special_conditions',
        'additional_info', 'description', 'Remarks', 'NOTES', 'COMMENTS'
      ]),
      
      referenceFromName: extractField([
        'referenceFromName', 'reference_from_name', 'reference', 'agent_name',
        'broker_name', 'intermediary', 'advisor_name', 'sales_person',
        'Agent Name', 'BROKER', 'REFERENCE', 'ADVISOR'
      ]),
      
      // Commission fields
      commissionPercentage: extractField([
        'commissionPercentage', 'commission_percentage', 'commission_percent', 'commission_%',
        'agent_commission_%', 'broker_commission_%', 'Commission %', 'COMMISSION PERCENTAGE'
      ]),
      
      commissionAmount: extractField([
        'commissionAmount', 'commission_amount', 'commission', 'agent_commission',
        'broker_commission', 'Commission Amount', 'COMMISSION', 'AGENT COMMISSION'
      ])
    };
    
    // Product Type mapping with extensive variations
    const productType = extractField([
      'productType', 'product_type', 'type', 'policy_type', 'coverage_type',
      'insurance_type', 'plan_type', 'category', 'line_of_business',
      'Product Type', 'POLICY TYPE', 'COVERAGE TYPE', 'CATEGORY'
    ]);
    
    debugLog('🔍 Extracted and mapped form data:', mappedData);
    debugLog('🔍 Product type extracted:', productType);
    
    // Additional smart mapping for specific insurance formats
    // Handle Go Digit specific fields from your PDF
    const smartMappedData = {
      ...mappedData,
      // Try to extract additional data from nested objects or arrays
      ...(dataRecord.vehicleDetails && typeof dataRecord.vehicleDetails === 'object' ? 
        extractVehicleDetails(dataRecord.vehicleDetails as Record<string, unknown>) : {}),
      ...(dataRecord.policyDetails && typeof dataRecord.policyDetails === 'object' ? 
        extractPolicyDetails(dataRecord.policyDetails as Record<string, unknown>) : {}),
      ...(dataRecord.premiumDetails && typeof dataRecord.premiumDetails === 'object' ? 
        extractPremiumDetails(dataRecord.premiumDetails as Record<string, unknown>) : {})
    };
    
    // Use flushSync to ensure immediate state updates
    flushSync(() => {
      setFormData(prev => {
        const updated = { ...prev, ...smartMappedData };
        debugLog('🔄 Form state updated with adaptive mapping:', updated);
        return updated;
      });
    });
    
    // Set product type with smart matching
    if (productType) {
      const normalizedProductType = normalizeProductType(productType);
      flushSync(() => {
        setProductType(normalizedProductType);
      });
    }
    
    // Show success message with extracted data count
    const extractedFieldsCount = Object.values(smartMappedData).filter(value => value && value.length > 0).length;
    toast.success(`🎉 Extracted ${extractedFieldsCount} fields from PDF! Please review and edit if needed.`, { 
      duration: 4000
    });
    
    debugLog('✅ Adaptive auto-fill completed successfully');
  };
  
  // Helper function to extract vehicle details from nested objects
  const extractVehicleDetails = (vehicleData: Record<string, unknown>) => {
    return {
      registrationNo: String(vehicleData.registrationNo || vehicleData.regNo || vehicleData.vehicleNumber || '').trim(),
      engineNo: String(vehicleData.engineNo || vehicleData.engineNumber || '').trim(),
      chasisNo: String(vehicleData.chasisNo || vehicleData.chassisNo || vehicleData.vin || '').trim(),
      hp: String(vehicleData.hp || vehicleData.power || vehicleData.horsepower || '').trim(),
      idv: String(vehicleData.idv || vehicleData.vehicleValue || vehicleData.sumInsured || '').trim()
    };
  };
  
  // Helper function to extract policy details from nested objects
  const extractPolicyDetails = (policyData: Record<string, unknown>) => {
    return {
      policyNumber: String(policyData.policyNumber || policyData.policyNo || policyData.uinNo || '').trim(),
      startDate: String(policyData.startDate || policyData.fromDate || policyData.effectiveDate || '').trim(),
      expiryDate: String(policyData.expiryDate || policyData.toDate || policyData.maturityDate || '').trim()
    };
  };
  
  // Helper function to extract premium details from nested objects
  const extractPremiumDetails = (premiumData: Record<string, unknown>) => {
    return {
      premiumAmount: String(premiumData.basicPremium || premiumData.netPremium || premiumData.corePremium || '').trim(),
      totalPremium: String(premiumData.totalPremium || premiumData.finalAmount || premiumData.payableAmount || '').trim(),
      gst: String(premiumData.gst || premiumData.tax || premiumData.serviceTax || '').trim(),
      ncbPercentage: String(premiumData.ncb || premiumData.noClaimBonus || premiumData.discount || '').trim()
    };
  };
  
  // Helper function to normalize product type to match dropdown options
  const normalizeProductType = (productType: string): string => {
    const normalized = productType.toUpperCase().trim();
    
    // Map various product type formats to our standard options
    if (normalized.includes('TWO') || normalized.includes('2W') || normalized.includes('BIKE') || normalized.includes('MOTORCYCLE')) {
      return 'TW';
    }
    if (normalized.includes('FOUR') || normalized.includes('4W') || normalized.includes('CAR') || normalized.includes('PRIVATE')) {
      return 'FOUR WHEELER';
    }
    if (normalized.includes('COMMERCIAL') || normalized.includes('GOODS') || normalized.includes('TRUCK')) {
      return 'GCV';
    }
    if (normalized.includes('PASSENGER') || normalized.includes('BUS') || normalized.includes('TAXI')) {
      return 'PCV';
    }
    if (normalized.includes('HEALTH') || normalized.includes('MEDICAL') || normalized.includes('MEDICLAIM')) {
      return 'HEALTH';
    }
    if (normalized.includes('FIRE') || normalized.includes('PROPERTY')) {
      return 'FIRE';
    }
    if (normalized.includes('LIABILITY') || normalized.includes('PUBLIC')) {
      return 'LIABILITY';
    }
    if (normalized.includes('MARINE') || normalized.includes('CARGO') || normalized.includes('TRANSIT')) {
      return 'MARINE';
    }
    if (normalized.includes('LIFE') || normalized.includes('TERM') || normalized.includes('ENDOWMENT')) {
      return 'LIFE';
    }
    
    // If no match found, return as is or default to MISC
    return productType || 'MISC';
  };

  // Monitor form data changes for debugging
  useEffect(() => {
    debugLog('🔄 Form data state changed:', formData);
    debugLog('🔄 Policyholder name in state:', formData.policyholderName);
  }, [formData]);

  // Force re-render when form data changes
  useEffect(() => {
    if (formData.policyholderName) {
      debugLog('🔄 Policyholder name detected, forcing re-render');
    }
  }, [formData.policyholderName]);

  // AI extraction function using n8n webhook
  const extractDataWithAI = async (file: File): Promise<{ extractedData: AIExtractedData; additionalData: Record<string, unknown> }> => {
    const webhookUrl = getWebhookUrl();
    
    try {
      debugLog('📄 Starting AI extraction for file:', file.name);
      debugLog('📊 File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      debugLog('🌐 Using webhook URL:', webhookUrl);
      
      // Validate file size
      if (file.size > config.MAX_FILE_SIZE) {
        throw new Error(`File is too large. Maximum size is ${config.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }
      
      // Create FormData to send the PDF file
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());
      formData.append('timestamp', new Date().toISOString());
      
      debugLog('🚀 Sending request to n8n webhook:', webhookUrl);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, config.TIMEOUT_MS);
      
      // Send PDF to n8n webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Let browser set Content-Type for FormData
        }
      });
      
      clearTimeout(timeoutId);
      debugLog('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        debugLog('❌ HTTP Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        debugLog('❌ Non-JSON Response:', responseText);
        throw new Error(`Expected JSON response but got: ${contentType}. Response: ${responseText.substring(0, 200)}...`);
      }

      let data;
      try {
        const responseText = await response.text();
        debugLog('📄 Raw response text:', responseText);
        
        if (!responseText.trim()) {
          throw new Error('Empty response from webhook - the n8n workflow may not be returning any data');
        }
        
        data = JSON.parse(responseText);
      } catch (parseError) {
        debugLog('💥 JSON Parse Error:', parseError);
        throw new Error(`Invalid JSON response from webhook: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }
      debugLog('🎯 AI Response received:', data);
      debugLog('🎯 Response type:', typeof data);
      debugLog('🎯 Response keys:', Object.keys(data || {}));
      
      // Validate that we received a proper response
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from AI service');
      }

      // Handle the specific n8n output format: [{ "output": { ... } }] - similar to popup.js
      let actualData;
      
      if (Array.isArray(data) && data.length > 0 && data[0].output) {
        // n8n format: [{ "output": { data } }]
        actualData = data[0].output;
        debugLog('📦 Extracted actual data from array format:', actualData);
      } else if (data.output) {
        // Alternative format: { "output": { data } }
        actualData = data.output;
        debugLog('📦 Extracted actual data from object format:', actualData);
      } else if (data.data) {
        // Format: { "data": { data } }
        actualData = data.data;
        debugLog('📦 Extracted actual data from data property:', actualData);
      } else {
        // Direct format: { data }
        actualData = data;
        debugLog('📦 Using direct response format:', actualData);
      }

      // Validate that we have actual data
      if (!actualData || typeof actualData !== 'object') {
        throw new Error('No valid data found in n8n response');
      }
      
      // Parse the AI response and map to our interface
      // Adjust this mapping based on your AI agent's response format
      const extractedData: AIExtractedData = {
        policyholderName: String(actualData.policyholderName || actualData.policyholder_name || actualData.name || '').trim(),
        policyNumber: String(actualData.policyNumber || actualData.policy_number || actualData.policyNo || '').trim(),
        insuranceCompany: String(actualData.insuranceCompany || actualData.insurance_company || actualData.company || '').trim(),
        startDate: String(actualData.startDate || actualData.start_date || actualData.fromDate || '').trim(),
        expiryDate: String(actualData.expiryDate || actualData.expiry_date || actualData.toDate || '').trim(),
        premiumAmount: String(actualData.premiumAmount || actualData.premium_amount || actualData.totalPremium || actualData.total_premium || actualData.premium || '').trim(),
        productType: String(actualData.productType || actualData.product_type || actualData.type || '').trim()
      };
      
      debugLog('✅ Mapped extracted data:', extractedData);
      
      // Check if we got any meaningful data
      const hasData = Object.values(extractedData).some(value => value && value.length > 0);
      if (!hasData) {
        debugLog('⚠️ No meaningful data extracted from AI response');
        toast.error('AI could not extract meaningful data from the PDF. Please fill the form manually.', { 
          id: 'ai-processing',
          duration: 5000 
        });
      }
      
      return { extractedData, additionalData: actualData };
    } catch (error) {
      debugLog('💥 Error calling n8n webhook:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - AI analysis took too long. Please try with a smaller file or try again.');
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Network error - Please check your internet connection and try again.');
        }
        if (error.message.includes('CORS')) {
          throw new Error('CORS error - Please contact support to resolve this issue.');
        }
        throw new Error(`AI extraction failed: ${error.message}`);
      }
      
      throw new Error('Failed to extract data from PDF. Please try again or fill the form manually.');
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handlePDFUpload(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handlePDFUpload(files);
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handlePDFUpload = async (files: File[]) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    // Filter only PDF files
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast.error('Please select PDF files only');
      return;
    }

    if (pdfFiles.length !== files.length) {
      toast.error(`${files.length - pdfFiles.length} non-PDF file(s) were ignored`);
    }

    // Check limit
    if (uploadedPDFs.length + pdfFiles.length > MAX_FILES_LIMIT) {
      toast.error(`Maximum ${MAX_FILES_LIMIT} files allowed. You already have ${uploadedPDFs.length} file(s) uploaded.`);
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${pdfFiles.length} file(s)...`);

    try {
      if (!effectiveUserId || !user) {
        toast.error('User not authenticated. Please log in again.', { id: toastId });
        setIsUploading(false);
        return;
      }

      // Upload files to Firebase Storage
      const uploadResults = await storageService.uploadMultiplePDFs(pdfFiles, effectiveUserId);
      
      const successfulUploads = uploadResults.filter(result => result !== null) as Array<{ url: string; path: string; fileName: string }>;
      
      if (successfulUploads.length === 0) {
        toast.error('Failed to upload files', { id: toastId });
        return;
      }

      // Add to uploaded PDFs list
      const newUploads = successfulUploads.map((result, index) => ({
        file: pdfFiles[index],
        url: result.url,
        path: result.path
      }));

      setUploadedPDFs(prev => [...prev, ...newUploads]);

      // Store first file info in form data for backward compatibility
      if (newUploads.length > 0) {
        setFormData(prev => ({
          ...prev,
          pdfFileName: newUploads[0].file.name,
          driveFileUrl: newUploads[0].url,
          fileId: newUploads[0].path
        }));
      }

      toast.success(`${successfulUploads.length} file(s) uploaded successfully!`, { id: toastId });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePDF = async (index: number) => {
    const pdf = uploadedPDFs[index];
    
    // Delete from Firebase Storage
    const deleted = await storageService.deleteFile(pdf.path);
    
    if (deleted) {
      const newUploadedPDFs = uploadedPDFs.filter((_, i) => i !== index);
      setUploadedPDFs(newUploadedPDFs);
      
      // Update form data if removing the first file
      if (index === 0 && newUploadedPDFs.length > 0) {
        setFormData(prev => ({
          ...prev,
          pdfFileName: newUploadedPDFs[0].file.name,
          driveFileUrl: newUploadedPDFs[0].url,
          fileId: newUploadedPDFs[0].path
        }));
      } else if (newUploadedPDFs.length === 0) {
        setFormData(prev => ({
          ...prev,
          pdfFileName: '',
          driveFileUrl: '',
          fileId: ''
        }));
      }
      
      toast.success('File removed successfully');
    } else {
      toast.error('Failed to remove file');
    }
  };

  // Client Documents handlers
  const handleClientDocsDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsClientDocsDragging(true);
  };

  const handleClientDocsDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsClientDocsDragging(false);
  };

  const handleClientDocsDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClientDocsDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsClientDocsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handleClientDocsUpload(files);
  };

  const handleClientDocsFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handleClientDocsUpload(files);
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleClientDocsUpload = async (files: File[]) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    // Check limit
    if (uploadedClientDocs.length + files.length > MAX_FILES_LIMIT) {
      toast.error(`Maximum ${MAX_FILES_LIMIT} files allowed. You already have ${uploadedClientDocs.length} file(s) uploaded.`);
      return;
    }

    setIsClientDocsUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} file(s) to your documents folder...`);

    try {
      if (!effectiveUserId || !user) {
        toast.error('User not authenticated. Please log in again.', { id: toastId });
        setIsClientDocsUploading(false);
        return;
      }

      // Get customer name and use policy number as unique identifier (we know it before saving)
      const customerName = formData.policyholderName || 'general';
      const policyIdentifier = formData.policyNumber || `GEN-${Date.now()}`; // Use policy number
      
      // Upload files to Firebase Storage client documents bucket with customer folder
      const uploadResults = await storageService.uploadMultipleClientDocuments(
        files, 
        effectiveUserId,
        customerName,
        policyIdentifier // Use policy number as identifier
      );
      
      const successfulUploads = uploadResults.filter(result => result !== null) as Array<{ url: string; path: string; fileName: string }>;
      
      if (successfulUploads.length === 0) {
        toast.error('Failed to upload files', { id: toastId });
        return;
      }

      // Add to uploaded client docs list
      const newUploads = successfulUploads.map((result) => ({
        file: files.find(f => f.name === result.fileName)!,
        url: result.url,
        path: result.path
      }));

      setUploadedClientDocs(prev => [...prev, ...newUploads]);

      // Create a folder link reference from the first uploaded file path
      if (uploadedClientDocs.length === 0 && newUploads.length > 0) {
        // Extract the base URL and create a "folder view" reference
        const folderPath = `User: ${user.userId} - Client Documents`;
        setFormData(prev => ({
          ...prev,
          documentsFolderLink: folderPath
        }));
      }

      toast.success(`${successfulUploads.length} file(s) uploaded to your documents folder!`, { id: toastId });
    } catch (error) {
      console.error('Error uploading client documents:', error);
      toast.error('Failed to upload files', { id: toastId });
    } finally {
      setIsClientDocsUploading(false);
    }
  };

  const handleRemoveClientDoc = async (index: number) => {
    const doc = uploadedClientDocs[index];
    
    // Delete from Firebase Storage
    const deleted = await storageService.deleteClientDocument(doc.path);
    
    if (deleted) {
      const newUploadedDocs = uploadedClientDocs.filter((_, i) => i !== index);
      setUploadedClientDocs(newUploadedDocs);
      
      // Clear folder link if no documents remain
      if (newUploadedDocs.length === 0) {
        setFormData(prev => ({
          ...prev,
          documentsFolderLink: ''
        }));
      }
      
      toast.success('Document removed successfully');
    } else {
      toast.error('Failed to remove document');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check for maximum file limit to prevent AI overloading
    if (files.length > MAX_FILES_LIMIT) {
      toast.error(`Maximum ${MAX_FILES_LIMIT} files allowed at a time. Please select fewer files to prevent AI overloading.`, {
        duration: 6000
      });
      // Reset the file input
      e.target.value = '';
      return;
    }

    // Validate files
    const validFiles = files.filter(file => {
      if (!config.SUPPORTED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a PDF file`);
        return false;
      }
      if (file.size > config.MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is ${config.MAX_FILE_SIZE / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      toast.error('No valid PDF files selected');
      return;
    }

    debugLog('📄 Files selected:', validFiles.map(f => f.name));

    // Set multi-file mode if more than one file
    if (validFiles.length > 1) {
      setIsMultiFileMode(true);
      setSelectedFiles(validFiles);
      setCurrentFileIndex(0);
      setProcessedCount(0);
      toast.success(`${validFiles.length} files selected. Processing first file...`, { duration: 4000 });
      // Immediately start processing the first file
      await processSingleFile(validFiles[0]);
    } else {
      // Single file mode - process immediately (original behavior)
      setIsMultiFileMode(false);
      await processSingleFile(validFiles[0]);
    }
  };

  const processSingleFile = async (file: File) => {
    setUploadedFile(file);
    setIsAIProcessing(true);

    try {
      debugLog('🚀 Starting AI processing for:', file.name);
      toast.loading(`AI is analyzing ${file.name}...`, { id: 'ai-processing' });
      
      // Extract data using AI via n8n webhook
      debugLog('🔄 Calling AI extraction function...');
      const { extractedData, additionalData } = await extractDataWithAI(file);
      debugLog('🎉 AI extraction completed successfully!');
      
      // Auto-fill form with extracted data from n8n
      debugLog('📝 Auto-filling form with n8n extracted data...');
      
      // Store file information
      setFormData(prev => ({
        ...prev,
        pdfFile: file,
        pdfFileName: file.name
      }));
      
      // Combine extracted data and additional data for comprehensive auto-fill
      const combinedData = { ...extractedData, ...additionalData };
      
      // Use our dedicated auto-fill function
      autoFillFormFromN8nData(combinedData);

      // If in multi-file mode, show success and prepare for next file
      if (isMultiFileMode) {
        const newProcessedCount = processedCount + 1;
        setProcessedCount(newProcessedCount);
        
        if (currentFileIndex < selectedFiles.length - 1) {
          toast.success(`✅ File ${newProcessedCount}/${selectedFiles.length} processed! Form auto-filled. Review and submit to continue.`, { 
            id: 'ai-processing',
            duration: 6000 
          });
        } else {
          toast.success(`🎉 All ${selectedFiles.length} files processed! This is the last file.`, { 
            id: 'ai-processing',
            duration: 6000 
          });
        }
      } else {
        toast.success('✅ PDF processed successfully! Form auto-filled.', { 
          id: 'ai-processing',
          duration: 4000 
        });
      }
    } catch (error) {
      console.error('Error uploading file or extracting data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file or extract policy details';
      toast.error(`❌ ${errorMessage}`, { 
        id: 'ai-processing',
        duration: 5000
      });
      
      // AI extraction failed - user should fill the form manually
      // File upload to cloud storage should be handled via the pdfLink field (Google Drive)
    } finally {
      setIsAIProcessing(false);
    }
  };

  const processNextFile = async () => {
    if (!isMultiFileMode || currentFileIndex >= selectedFiles.length - 1) {
      toast.error('No more files to process');
      return;
    }

    const nextIndex = currentFileIndex + 1;
    setCurrentFileIndex(nextIndex);
    
    // Clear current form data before processing next file
    setFormData({
      policyholderName: '',
      policyType: 'General',
      insuranceCompany: '',
      policyNumber: '',
      startDate: '',
      expiryDate: '',
      premiumAmount: '',
      pdfFile: undefined,
      pdfFileName: '',
      fileId: '',
      driveFileUrl: '',
      pdfLink: '',
      documentsFolderLink: '',
      contactNo: '',
      emailId: '',
      registrationNo: '',
      engineNo: '',
      chasisNo: '',
      hp: '',
      riskLocationAddress: '',
      idv: '',
      netPremium: '',
      odPremium: '',
      thirdPartyPremium: '',
      gst: '',
      totalPremium: '',
      commissionPercentage: '',
      commissionAmount: '',
      remark: '',
      referenceFromName: '',
      isOneTimePolicy: false,
      ncbPercentage: '',
      businessType: 'New',
      memberOf: ''
    });
    setProductType('');
    setUploadedFile(null);

    // Process the next file
    await processSingleFile(selectedFiles[nextIndex]);
  };

  const resetMultiFileMode = () => {
    setIsMultiFileMode(false);
    setSelectedFiles([]);
    setCurrentFileIndex(0);
    setProcessedCount(0);
    setUploadedFile(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.policyholderName.trim()) {
      newErrors.policyholderName = 'Policyholder name is required';
    }

    if (!productType.trim()) {
      newErrors.productType = 'Product type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if policy number already exists
      if (formData.policyNumber) {
        const existingPolicy = policies.find((p: Policy) => 
          p.policyNumber.toLowerCase() === formData.policyNumber.toLowerCase()
        );
        
        if (existingPolicy) {
          toast.error('This policy number already exists. Please enter a unique policy number.');
          setIsSubmitting(false);
          return;
        }
      }

      const policyData = {
        policyholderName: formData.policyholderName.trim(),
        policyType: 'General' as const, // Fixed as General Insurance
        insuranceCompany: formData.insuranceCompany || 'General Insurance Company',
        policyNumber: formData.policyNumber || `GEN-${Date.now()}`, // Use form data or auto-generated
        businessType: formData.businessType,
        memberOf: formData.memberOf || undefined,
        policyStartDate: formData.startDate || new Date().toISOString().split('T')[0], // Map startDate to policyStartDate
        policyEndDate: formData.expiryDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // Map expiryDate to policyEndDate
        premiumAmount: parseFloat(formData.totalPremium || formData.premiumAmount || '0') || 0,
        coverageAmount: parseFloat(formData.idv || '0') || undefined, // Map IDV to coverageAmount
        address: formData.riskLocationAddress || undefined, // Map riskLocationAddress to address
        contactNo: formData.contactNo,
        emailId: formData.emailId,
        notes: formData.remark || undefined, // Map remark to notes
        documents: [], // Will be populated later if needed
        status: 'active' as const,
        documentsFolderLink: formData.documentsFolderLink,
        registrationNo: formData.registrationNo,
        engineNo: formData.engineNo,
        chasisNo: formData.chasisNo,
        hp: formData.hp,
        riskLocationAddress: formData.riskLocationAddress,
        idv: formData.idv,
        netPremium: formData.netPremium,
        odPremium: formData.odPremium,
        thirdPartyPremium: formData.thirdPartyPremium,
        gst: formData.gst,
        totalPremium: formData.totalPremium,
        commissionPercentage: formData.commissionPercentage || undefined,
        commissionAmount: formData.commissionAmount || undefined,
        remark: formData.remark,
        productType: productType,
        referenceFromName: formData.referenceFromName,
        isOneTimePolicy: formData.isOneTimePolicy,
        ncbPercentage: formData.ncbPercentage,
        // File information from Firebase Storage
        pdfFileName: formData.pdfFileName,
        fileId: formData.fileId,
        driveFileUrl: formData.driveFileUrl
      };

      await addPolicy(policyData); // No file parameter needed
      
      // Handle multi-file mode: stay on page and process next file
      if (isMultiFileMode && currentFileIndex < selectedFiles.length - 1) {
        toast.success(`✅ Policy saved successfully! Processing next file...`, { duration: 3000 });
        
        // Automatically process the next file
        const nextIndex = currentFileIndex + 1;
        setCurrentFileIndex(nextIndex);
        
        // Clear current form data before processing next file
        setFormData({
          policyholderName: '',
          policyType: 'General',
          insuranceCompany: '',
          policyNumber: '',
          startDate: '',
          expiryDate: '',
          premiumAmount: '',
          pdfFile: undefined,
          pdfFileName: '',
          fileId: '',
          driveFileUrl: '',
          pdfLink: '',
          documentsFolderLink: '',
          contactNo: '',
          emailId: '',
          registrationNo: '',
          engineNo: '',
          chasisNo: '',
          hp: '',
          riskLocationAddress: '',
          idv: '',
          netPremium: '',
          odPremium: '',
          thirdPartyPremium: '',
          gst: '',
          totalPremium: '',
          commissionPercentage: '',
          commissionAmount: '',
          remark: '',
          referenceFromName: '',
          isOneTimePolicy: false,
          ncbPercentage: '',
          businessType: 'New',
          memberOf: ''
        });
        setProductType('');
        setUploadedFile(null);
        
        // Process the next file
        await processSingleFile(selectedFiles[nextIndex]);
      } else if (isMultiFileMode && currentFileIndex >= selectedFiles.length - 1) {
        // Last file in multi-file mode
        toast.success(`🎉 All ${selectedFiles.length} files processed and policies saved!`, { duration: 5000 });
        navigate('/policies');
      } else {
        // Single file mode - navigate to policies page
        navigate('/policies');
      }
    } catch (error) {
      console.error('Error adding policy:', error);
      // Error toast is already shown by the context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle insurance company autocomplete
    if (name === 'insuranceCompany') {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Filter insurance companies based on input
      if (value.trim()) {
        const filtered = INSURANCE_COMPANIES.filter(company =>
          company.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredInsuranceCompanies(filtered);
        setShowInsuranceDropdown(filtered.length > 0);
      } else {
        setFilteredInsuranceCompanies([]);
        setShowInsuranceDropdown(false);
      }
      
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
      return;
    }
    
    // Calculate commission amount when commission percentage or net/OD premium changes
    // For Two wheeler/Four wheeler: commission is calculated on OD Premium only
    // For others: commission is calculated on Net Premium
    if (name === 'commissionPercentage' || name === 'netPremium' || name === 'odPremium' || name === 'thirdPartyPremium') {
      setFormData(prev => {
        const updatedData = { ...prev, [name]: value };
        
        // Determine if this is a Two wheeler or Four wheeler product
        const isTwoOrFourWheeler = productType.toLowerCase().includes('two-wheeler') || 
                                    productType.toLowerCase().includes('two wheeler') ||
                                    productType.toLowerCase().includes('four-wheeler') ||
                                    productType.toLowerCase().includes('four wheeler') ||
                                    productType.toLowerCase().includes('private car');
        
        // Auto-calculate commission amount
        if (name === 'commissionPercentage') {
          let baseAmount = 0;
          if (isTwoOrFourWheeler) {
            // For Two/Four wheeler: use OD Premium
            baseAmount = parseFloat(prev.odPremium || '0');
          } else {
            // For others: use Net Premium
            baseAmount = parseFloat(prev.netPremium || '0');
          }
          const percentage = parseFloat(value || '0');
          const commissionAmount = (baseAmount * percentage) / 100;
          updatedData.commissionAmount = commissionAmount > 0 ? commissionAmount.toFixed(2) : '';
        } else if (name === 'netPremium') {
          // For non-Two/Four wheeler products
          if (!isTwoOrFourWheeler) {
            const percentage = parseFloat(prev.commissionPercentage || '0');
            const netPremium = parseFloat(value || '0');
            const commissionAmount = (netPremium * percentage) / 100;
            updatedData.commissionAmount = commissionAmount > 0 ? commissionAmount.toFixed(2) : '';
          }
        } else if (name === 'odPremium') {
          // For Two/Four wheeler products: recalculate based on OD Premium
          if (isTwoOrFourWheeler) {
            const percentage = parseFloat(prev.commissionPercentage || '0');
            const odPremium = parseFloat(value || '0');
            const commissionAmount = (odPremium * percentage) / 100;
            updatedData.commissionAmount = commissionAmount > 0 ? commissionAmount.toFixed(2) : '';
          }
        }
        // Note: thirdPartyPremium changes don't affect commission calculation
        
        return updatedData;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle insurance company selection from dropdown
  const handleInsuranceCompanySelect = (company: string) => {
    setFormData(prev => ({ ...prev, insuranceCompany: company }));
    setShowInsuranceDropdown(false);
    setFilteredInsuranceCompanies([]);
    
    // Clear error if exists
    if (errors.insuranceCompany) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.insuranceCompany;
        return newErrors;
      });
    }
  };

  const handleProductTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProductType(value);
    
    // Filter product types based on input
    if (value.trim()) {
      const filtered = PRODUCT_TYPES.filter(type =>
        type.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProductTypes(filtered);
      setShowProductTypeDropdown(filtered.length > 0);
    } else {
      setFilteredProductTypes([]);
      setShowProductTypeDropdown(false);
    }
    
    // Clear error when user starts typing
    if (errors.productType) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.productType;
        return newErrors;
      });
    }
  };

  // Handle product type selection from dropdown
  const handleProductTypeSelect = (type: string) => {
    setProductType(type);
    setShowProductTypeDropdown(false);
    setFilteredProductTypes([]);
    
    // Clear error if exists
    if (errors.productType) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.productType;
        return newErrors;
      });
    }
  };

  const handleOneTimePolicyToggle = () => {
    setFormData(prev => ({
      ...prev,
      isOneTimePolicy: !prev.isOneTimePolicy
    }));
  };

  return (
    <>
      <style>
        {`
          .compact-input {
            padding: 0.5rem 0.75rem !important;
          }
          .compact-textarea {
            padding: 0.5rem 0.75rem !important;
          }
        `}
      </style>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/policies')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Policies
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">OnClicks Policy Manager - Add New Policy</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Fill in the details to add a new general insurance policy</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors duration-200">
                     <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <FileText className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
              Policy Information
            </h2>
                         <p className="text-gray-600 dark:text-gray-300 mt-1">Please provide the policyholder name for your general insurance policy</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 lg:space-y-6">
            {/* AI Upload Section */}
                         <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4 border border-purple-200 dark:border-gray-600">
                             <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-3">
                <Sparkles className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                AI Powered Policy Upload (Single & Multi-File Support)
              </h3>
                             <p className="text-gray-600 dark:text-gray-300 mb-3">Upload single or multiple policy documents and let our AI extract all the details automatically</p>
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                  <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Maximum {MAX_FILES_LIMIT} files allowed</span> - to prevent AI overloading and ensure optimal processing speed
                </p>
              </div>
              
              <div className="flex items-center flex-wrap gap-4">
                <label className={`flex items-center px-6 py-3 ${
                  isAIProcessing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                } text-white rounded-lg transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl`}>
                  <Upload className="h-5 w-5 mr-2" />
                  {isAIProcessing ? 'Processing...' : 'Upload PDF(s) for AI Analysis'}
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isAIProcessing}
                  />
                </label>
                
                {/* Multi-file mode controls */}
                {isMultiFileMode && (
                  <>
                    {currentFileIndex < selectedFiles.length - 1 && processedCount > 0 && (
                      <button
                        type="button"
                        onClick={processNextFile}
                        disabled={isAIProcessing}
                        className={`flex items-center px-6 py-3 ${
                          isAIProcessing
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                        } text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl`}>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Process Next File (Manual)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={resetMultiFileMode}
                      disabled={isAIProcessing}
                      className="flex items-center px-4 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-all duration-200"
                    >
                      Reset
                    </button>
                  </>
                )}
                
                {uploadedFile && !isAIProcessing && (
                  <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <FileText className="h-4 w-4 mr-1" />
                    ✓ {uploadedFile.name}
                  </div>
                )}
                
                {isAIProcessing && (
                  <div className="flex items-center text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                    AI Analyzing Document...
                  </div>
                )}
              </div>

              {/* Multi-file progress indicator */}
              {isMultiFileMode && (
                <div className="mt-4 p-4 bg-orange-50 dark:bg-gray-700 rounded-lg border border-orange-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300">Multi-File Processing Mode</h4>
                    <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                      {processedCount} of {selectedFiles.length} files processed
                      {!isAIProcessing && processedCount < selectedFiles.length && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">
                          (Processing: {selectedFiles[currentFileIndex]?.name || 'Unknown'})
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="w-full bg-orange-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${selectedFiles.length > 0 ? (processedCount / selectedFiles.length) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <span 
                          key={index}
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            index < currentFileIndex || (index === currentFileIndex && processedCount > index) ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200' :
                            index === currentFileIndex ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200' :
                            'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {index + 1}. {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                          {index < currentFileIndex || (index === currentFileIndex && processedCount > index) ? ' ✓' : 
                           index === currentFileIndex ? ' 🔄' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-orange-700 dark:text-orange-300">
                    <p><strong>Instructions:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 mt-1">
                      <li>AI will automatically process each file and auto-fill the form</li>
                      <li>Review the extracted data and click "Add Policy" to save</li>
                      <li>The next file will automatically be processed after saving</li>
                      <li>Continue until all files are processed and saved</li>
                    </ol>
                  </div>
                </div>
              )}
              
              {/* AI Processing Status */}
              {isAIProcessing && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-gray-600">
                  <div className="flex items-center text-blue-700 dark:text-blue-300">
                    <div className="animate-pulse h-2 w-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">
                      AI is extracting policy information from your document...
                      {isMultiFileMode && ` (File ${currentFileIndex + 1} of ${selectedFiles.length})`}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">This usually takes 10-30 seconds depending on document complexity.</p>
                </div>
              )}
              
              {/* Success Message */}
              {uploadedFile && !isAIProcessing && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200 dark:border-gray-600">
                  <div className="flex items-center text-green-700 dark:text-green-300">
                    <Sparkles className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">
                      AI extraction completed! Please review the auto-filled information below.
                      {isMultiFileMode && currentFileIndex < selectedFiles.length - 1 && ' After saving, the next file will automatically be processed.'}
                      {isMultiFileMode && currentFileIndex >= selectedFiles.length - 1 && ' This is the last file to process.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Policyholder Name */}
              <div>
                <label htmlFor="policyholderName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Policyholder Name *
                </label>
                <input
                  type="text"
                  id="policyholderName"
                  name="policyholderName"
                  value={formData.policyholderName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm compact-input bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.policyholderName ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter full name"
                />
                {errors.policyholderName && (
                  <p className="text-red-500 text-sm mt-1">{errors.policyholderName}</p>
                )}
              </div>

              {/* Policy Type - Fixed as General Insurance */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Policy Type
                </label>
                <div className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  General Insurance
                </div>
              </div>
              
              {/* Business Type - new, renewal and rollover */}
              <div>
                <label htmlFor="businessType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Business Type *
                </label>
                <input
                  id="businessType"
                  name="businessType"
                  type="text"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  list="businessTypeOptions"
                  placeholder="Select or type business type"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <datalist id="businessTypeOptions">
                  <option value="New">New</option>
                  <option value="Renewal">Renewal</option>
                  <option value="Rollover">Rollover</option>
                </datalist>
              </div>
            </div>

            {/* Member Of dropdown */}
            <div className="space-y-2">
              <label htmlFor="memberOf" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                <User className="inline h-4 w-4 mr-1" />
                Member Of (Group Head)
              </label>
              <select
                id="memberOf"
                name="memberOf"
                value={formData.memberOf}
                onChange={handleInputChange}
                disabled={isLoadingGroupHeads}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingGroupHeads ? 'Loading group heads...' : 'Select Group Head'}
                </option>
                {!isLoadingGroupHeads && groupHeads.map(gh => (
                  <option key={gh.id} value={gh.id}>
                    {gh.name}
                  </option>
                ))}
                {!isLoadingGroupHeads && groupHeads.length === 0 && (
                  <option value="" disabled>No group heads available</option>
                )}
              </select>
              {isLoadingGroupHeads && (
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 flex items-center">
                  <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading group heads from database...
                </p>
              )}
              {!isLoadingGroupHeads && groupHeads.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  No group heads found. Create one in the Group Heads section first.
                </p>
              )}
            </div>

            {/* Product Type - Searchable autocomplete */}
            <div className="md:col-span-2 lg:col-span-3 relative">
              <label htmlFor="productType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Product Type *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="productType"
                  value={productType}
                  onChange={handleProductTypeChange}
                  onFocus={() => {
                    if (productType.trim()) {
                      const filtered = PRODUCT_TYPES.filter(type =>
                        type.toLowerCase().includes(productType.toLowerCase())
                      );
                      setFilteredProductTypes(filtered);
                      setShowProductTypeDropdown(filtered.length > 0);
                    } else {
                      setFilteredProductTypes(PRODUCT_TYPES);
                      setShowProductTypeDropdown(true);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.productType ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Type to search product type..."
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              
              {/* Autocomplete Dropdown */}
              {showProductTypeDropdown && filteredProductTypes.length > 0 && (
                <div className="product-type-dropdown absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProductTypes.map((type, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleProductTypeSelect(type)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-gray-100 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
              
              {errors.productType && (
                <p className="text-red-500 text-sm mt-1">{errors.productType}</p>
              )}
            </div>

            {/* Conditional Form Fields based on Product Type */}
            {productType && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Additional Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {/* Contact No */}
                  <div>
                    <label htmlFor="contactNo" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Contact No
                    </label>
                    <input
                      type="tel"
                      id="contactNo"
                      name="contactNo"
                      value={formData.contactNo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      placeholder="Enter contact number"
                    />
                  </div>

                  {/* Email ID */}
                  <div>
                    <label htmlFor="emailId" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email ID
                    </label>
                    <input
                      type="email"
                      id="emailId"
                      name="emailId"
                      value={formData.emailId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Insurance Company Name */}
                  <div className="relative">
                    <label htmlFor="insuranceCompany" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Insurance Company Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="insuranceCompany"
                        name="insuranceCompany"
                        value={formData.insuranceCompany}
                        onChange={handleInputChange}
                        onFocus={() => {
                          if (formData.insuranceCompany.trim()) {
                            const filtered = INSURANCE_COMPANIES.filter(company =>
                              company.toLowerCase().includes(formData.insuranceCompany.toLowerCase())
                            );
                            setFilteredInsuranceCompanies(filtered);
                            setShowInsuranceDropdown(filtered.length > 0);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        placeholder="Type to search insurance company..."
                        autoComplete="off"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                    
                    {/* Autocomplete Dropdown */}
                    {showInsuranceDropdown && filteredInsuranceCompanies.length > 0 && (
                      <div className="insurance-dropdown absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredInsuranceCompanies.map((company, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleInsuranceCompanySelect(company)}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-gray-100 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            {company}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Policy Number */}
                  <div>
                    <label htmlFor="policyNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Policy Number
                    </label>
                    <input
                      type="text"
                      id="policyNumber"
                      name="policyNumber"
                      value={formData.policyNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      placeholder="Enter policy number"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label htmlFor="expiryDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="expiryDate"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                    />
                  </div>

                  {/* Four Wheeler Specific Fields */}
                  {productType === 'FOUR WHEELER' && (
                    <>
                      {/* Registration No */}
                      <div>
                        <label htmlFor="registrationNo" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Registration No
                        </label>
                        <input
                          type="text"
                          id="registrationNo"
                          name="registrationNo"
                          value={formData.registrationNo}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter registration number"
                        />
                      </div>

                      {/* Engine No */}
                      <div>
                        <label htmlFor="engineNo" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Engine No
                        </label>
                        <input
                          type="text"
                          id="engineNo"
                          name="engineNo"
                          value={formData.engineNo}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter engine number"
                        />
                      </div>

                      {/* Chassis No */}
                      <div>
                        <label htmlFor="chasisNo" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Chassis No
                        </label>
                        <input
                          type="text"
                          id="chasisNo"
                          name="chasisNo"
                          value={formData.chasisNo}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter chassis number"
                        />
                      </div>

                      {/* HP (Hypothecation) */}
                      <div>
                        <label htmlFor="hp" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          HP (Hypothecation)
                        </label>
                        <input
                          type="text"
                          id="hp"
                          name="hp"
                          value={formData.hp}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter hypothecation details"
                        />
                      </div>

                      {/* Risk Location Address */}
                      <div className="md:col-span-2 lg:col-span-3">
                        <label htmlFor="riskLocationAddress" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Risk Location Address
                        </label>
                        <textarea
                          id="riskLocationAddress"
                          name="riskLocationAddress"
                          value={formData.riskLocationAddress}
                          onChange={(e) => setFormData(prev => ({ ...prev, riskLocationAddress: e.target.value }))}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter risk location address"
                        />
                      </div>

                      {/* IDV (Insure Declare Value) */}
                      <div>
                        <label htmlFor="idv" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          IDV (Insure Declare Value)
                        </label>
                        <input
                          type="number"
                          id="idv"
                          name="idv"
                          value={formData.idv}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter IDV amount"
                        />
                      </div>
                    </>
                  )}

                  {/* Premium Fields - Conditional based on product type */}
                  {(productType.toLowerCase().includes('two-wheeler') || 
                    productType.toLowerCase().includes('two wheeler') ||
                    productType.toLowerCase().includes('four-wheeler') ||
                    productType.toLowerCase().includes('four wheeler') ||
                    productType.toLowerCase().includes('private car')) ? (
                    <>
                      {/* OD Premium - For Two/Four Wheeler */}
                      <div>
                        <label htmlFor="odPremium" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          OD Premium <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="odPremium"
                          name="odPremium"
                          value={formData.odPremium}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter OD premium amount"
                        />
                      </div>

                      {/* Third Party Premium - For Two/Four Wheeler */}
                      <div>
                        <label htmlFor="thirdPartyPremium" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Third Party Premium <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="thirdPartyPremium"
                          name="thirdPartyPremium"
                          value={formData.thirdPartyPremium}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter third party premium amount"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Net Premium - For Other Product Types */}
                      <div>
                        <label htmlFor="netPremium" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Net Premium
                        </label>
                        <input
                          type="number"
                          id="netPremium"
                          name="netPremium"
                          value={formData.netPremium}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter net premium amount"
                        />
                      </div>
                    </>
                  )}

                  {/* GST */}
                  <div>
                    <label htmlFor="gst" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      GST
                    </label>
                    <input
                      type="number"
                      id="gst"
                      name="gst"
                      value={formData.gst}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      placeholder="Enter GST amount"
                    />
                  </div>

                  {/* Total Premium */}
                  <div>
                    <label htmlFor="totalPremium" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Total Premium
                    </label>
                    <input
                      type="number"
                      id="totalPremium"
                      name="totalPremium"
                      value={formData.totalPremium}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      placeholder="Enter total premium amount"
                    />
                  </div>

                  {/* Commission Percentage */}
                  <div>
                    <label htmlFor="commissionPercentage" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Commission (%)
                    </label>
                    <input
                      type="number"
                      id="commissionPercentage"
                      name="commissionPercentage"
                      value={formData.commissionPercentage}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      placeholder="Enter commission percentage (e.g., 10)"
                    />
                  </div>

                  {/* Commission Amount (Auto-calculated) */}
                  <div>
                    <label htmlFor="commissionAmount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Commission Amount
                    </label>
                    <input
                      type="number"
                      id="commissionAmount"
                      name="commissionAmount"
                      value={formData.commissionAmount}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg cursor-not-allowed shadow-sm"
                      placeholder="Auto-calculated"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {(productType.toLowerCase().includes('two-wheeler') || 
                        productType.toLowerCase().includes('two wheeler') ||
                        productType.toLowerCase().includes('four-wheeler') ||
                        productType.toLowerCase().includes('four wheeler') ||
                        productType.toLowerCase().includes('private car'))
                        ? `Automatically calculated as ${formData.commissionPercentage || '0'}% of OD Premium`
                        : `Automatically calculated as ${formData.commissionPercentage || '0'}% of Net Premium`
                      }
                    </p>
                  </div>

                  {/* Remark */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label htmlFor="remark" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Remark
                    </label>
                    <textarea
                      id="remark"
                      name="remark"
                      value={formData.remark}
                      onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      placeholder="Enter any remarks or additional notes"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    {/* Reference From Name */}
                    <div className="mb-6">
                      <label htmlFor="referenceFromName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Reference From (Name)
                      </label>
                      <input
                        type="text"
                        id="referenceFromName"
                        name="referenceFromName"
                        value={formData.referenceFromName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        placeholder="Enter reference person's name"
                      />
                    </div>

                    {/* NCB Percentage */}
                    <div className="mb-6">
                      <label htmlFor="ncbPercentage" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        NCB % (No Claim Bonus Percentage)
                      </label>
                      <input
                        type="number"
                        id="ncbPercentage"
                        name="ncbPercentage"
                        value={formData.ncbPercentage}
                        onChange={handleInputChange}
                        min="0"
                        max="50"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        placeholder="Enter NCB percentage (0-50%)"
                      />
                    </div>

                    {/* One-Time Policy Toggle */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border dark:bg-yellow-900/20 dark:border-yellow-600">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-white">
                            One-Time Policy
                          </label>
                          <p className="text-xs text-gray-600 mt-1 dark:text-white">
                            Mark this policy to exclude from reminders and alerts
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleOneTimePolicyToggle}
                          className="flex items-center"
                        >
                          {formData.isOneTimePolicy ? (
                            <ToggleRight className="h-8 w-8 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* PDF Link Input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <FileText className="inline h-4 w-4 mr-1" />
                        Policy Documents (PDF Upload)
                      </label>
                      
                      {/* Drag and Drop Area */}
                      <div
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                          isDragging
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Upload className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'} mb-4`} />
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {isDragging ? 'Drop files here' : 'Drag and drop PDF files here'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">or</p>
                          <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                            <Upload className="h-4 w-4 mr-2" />
                            Browse Files
                            <input
                              type="file"
                              accept=".pdf"
                              multiple
                              onChange={handleFileSelect}
                              className="hidden"
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                          Maximum {MAX_FILES_LIMIT} files, 10MB per file
                        </p>
                      </div>

                      {/* Uploaded Files List */}
                      {uploadedPDFs.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Uploaded Files ({uploadedPDFs.length})
                          </p>
                          {uploadedPDFs.map((pdf, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <FileText className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {pdf.file.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {(pdf.file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <a
                                  href={pdf.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-medium"
                                >
                                  View
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePDF(index)}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 p-1"
                                  title="Remove file"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Client Documents Upload Section */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <FileText className="inline h-4 w-4 mr-1" />
                        Client Documents Folder
                      </label>
                      
                      {/* Instructions */}
                      <div className="mb-4 p-4 border border-green-200 dark:border-green-600 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">📁 Upload client documents</h4>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Upload any documents related to this client (PDFs, images, Word docs). Each user has their own private folder in Firebase Storage.
                        </p>
                      </div>

                      {/* Drag and Drop Area */}
                      <div
                        onDragEnter={handleClientDocsDragEnter}
                        onDragOver={handleClientDocsDragOver}
                        onDragLeave={handleClientDocsDragLeave}
                        onDrop={handleClientDocsDrop}
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                          isClientDocsDragging
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                        } ${isClientDocsUploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Upload className={`mx-auto h-12 w-12 ${isClientDocsDragging ? 'text-green-500' : 'text-gray-400'} mb-4`} />
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {isClientDocsDragging ? 'Drop documents here' : 'Drag and drop documents here'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">or</p>
                          <label className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors">
                            <Upload className="h-4 w-4 mr-2" />
                            Browse Files
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              multiple
                              onChange={handleClientDocsFileSelect}
                              className="hidden"
                              disabled={isClientDocsUploading}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                          Supported: PDF, JPG, PNG, DOC, DOCX • Maximum {MAX_FILES_LIMIT} files, 10MB each
                        </p>
                      </div>

                      {/* Uploaded Client Documents List */}
                      {uploadedClientDocs.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Uploaded Documents ({uploadedClientDocs.length})
                          </p>
                          {uploadedClientDocs.map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <FileText className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {doc.file.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {(doc.file.size / 1024 / 1024).toFixed(2)} MB • {doc.file.type.split('/')[1].toUpperCase()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-medium"
                                >
                                  View
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveClientDoc(index)}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 p-1"
                                  title="Remove document"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/policies')}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center shadow-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding Policy...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Policy
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
    </div>
    </>
  );
}
