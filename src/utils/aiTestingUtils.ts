export const sampleAIResponse = {
  // Standard field names (recommended)
  policyholderName: "John Doe",
  policyNumber: "HDFC-VEH-2024-001",
  insuranceCompany: "HDFC ERGO General Insurance",
  startDate: "2024-01-15",
  expiryDate: "2025-01-15",
  premiumAmount: "18500",
  productType: "FOUR WHEELER",
  
  // Alternative field names (for compatibility)
  policyholder_name: "John Doe",
  policy_number: "HDFC-VEH-2024-001",
  insurance_company: "HDFC ERGO General Insurance",
  start_date: "2024-01-15",
  expiry_date: "2025-01-15",
  premium_amount: "18500",
  product_type: "FOUR WHEELER",
  
  // Additional fields
  contactNo: "9876543210",
  contact_no: "9876543210",
  emailId: "john.doe@email.com",
  email_id: "john.doe@email.com",
  registrationNo: "MH01AB1234",
  registration_no: "MH01AB1234",
  engineNo: "ENG123456789",
  engine_no: "ENG123456789",
  chasisNo: "CHA987654321",
  chasis_no: "CHA987654321",
  hp: "1200",
  horsepower: "1200",
  riskLocationAddress: "Mumbai, Maharashtra, India",
  risk_location_address: "Mumbai, Maharashtra, India",
  idv: "500000",
  insured_declared_value: "500000",
  netPremium: "16500",
  net_premium: "16500",
  gst: "2000",
  tax: "2000",
  totalPremium: "18500",
  total_premium: "18500",
  ncbPercentage: "20",
  ncb_percentage: "20",
  remark: "Vehicle insurance policy for Honda City",
  referenceFromName: "Agent Smith",
  reference_from_name: "Agent Smith"
};

// Test webhook endpoint for development
export const testWebhookResponse = async () => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  return sampleAIResponse;
};

// Webhook format validation
export const validateWebhookResponse = (response: Record<string, unknown>): boolean => {
  const requiredFields = [
    'policyholderName', 'policyholder_name',
    'policyNumber', 'policy_number',
    'insuranceCompany', 'insurance_company',
    'startDate', 'start_date',
    'expiryDate', 'expiry_date',
    'premiumAmount', 'premium_amount'
  ];
  
  // Check if at least one version of each required field exists
  const hasRequiredFields = requiredFields.some(field => 
    Object.prototype.hasOwnProperty.call(response, field) && response[field]
  );
  
  return hasRequiredFields;
};

// Format dates for form input (YYYY-MM-DD)
export const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  
  // Handle various date formats
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    // Try parsing DD/MM/YYYY format
    const parts = dateString.split(/[/.\\-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
    return '';
  }
  
  return date.toISOString().split('T')[0];
};

// Clean numeric values (remove currency symbols, commas, etc.)
export const cleanNumericValue = (value: string): string => {
  if (!value) return '';
  return value.toString().replace(/[₹,\s]/g, '').replace(/[^\d.]/g, '');
};
