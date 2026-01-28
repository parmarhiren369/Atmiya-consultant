import { supabase } from '../config/supabase';
import { storageService } from './storageService';

interface ClientFolder {
  id: string;
  policyNumber: string; // Add policy number
  policyholderName: string;
  policyType: string;
  insuranceCompany: string;
  documentCount: number;
  driveFileUrl?: string;
  documentsFolderLink?: string;
}

/**
 * Get all client folders with their document counts
 * Groups policies by policyholder name and aggregates document information
 */
export async function getClientFolders(userId: string): Promise<ClientFolder[]> {
  try {
    // Fetch all active policies for the user
    const { data: policies, error } = await supabase
      .from('policies')
      .select('*')
      .eq('user_id', userId)
      .order('policyholder_name', { ascending: true });

    if (error) {
      console.error('Error fetching policies:', error);
      throw error;
    }

    if (!policies || policies.length === 0) {
      return [];
    }

    // Group policies by policyholder name
    // Each unique policyholder name becomes a client folder
    const clientMap = new Map<string, ClientFolder>();

    policies.forEach((policy) => {
      const key = (policy.policyholder_name || policy.policyholderName || '').toLowerCase();
      
      if (!clientMap.has(key)) {
        // Create a new client folder entry
        clientMap.set(key, {
          id: policy.id,
          policyholderName: policy.policyholder_name || policy.policyholderName,
          policyNumber: policy.policy_number || policy.policyNumber,
          policyType: policy.policy_type || policy.policyType || 'General',
          insuranceCompany: policy.insurance_company || policy.insuranceCompany,
          documentCount: 0,
          driveFileUrl: policy.drive_file_url || policy.driveFileUrl,
          documentsFolderLink: policy.documents_folder_link || policy.documentsFolderLink,
        });
      }
    });

    // Get actual document counts from Supabase Storage for each client
    const clientFolders = Array.from(clientMap.values());
    
    // Fetch document counts in parallel
    const documentCountPromises = clientFolders.map(async (folder) => {
      try {
        const files = await storageService.listUserFiles(
          userId,
          'client-documents',
          folder.policyholderName,
          folder.policyNumber // Use policy number as identifier
        );
        folder.documentCount = files.length;
      } catch (error) {
        console.error(`Error counting documents for ${folder.policyholderName}:`, error);
        folder.documentCount = 0;
      }
      return folder;
    });

    await Promise.all(documentCountPromises);

    return clientFolders;
  } catch (error) {
    console.error('Error in getClientFolders:', error);
    throw error;
  }
}

/**
 * Get all documents for a specific client
 */
export async function getClientDocuments(userId: string, policyholderName: string) {
  try {
    const { data: policies, error } = await supabase
      .from('policies')
      .select('*')
      .eq('user_id', userId)
      .ilike('policyholder_name', policyholderName)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching client documents:', error);
      throw error;
    }

    return policies || [];
  } catch (error) {
    console.error('Error in getClientDocuments:', error);
    throw error;
  }
}
