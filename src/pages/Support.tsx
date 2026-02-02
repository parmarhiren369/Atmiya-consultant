import { useState } from 'react';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Send, 
  AlertTriangle,
  HelpCircle,
  FileText,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Globe,
  Bell,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';

// Define a type for FAQ items
interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export function Support() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>('general');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // List of FAQs categorized
  const faqs: FAQItem[] = [
    {
      question: "How do I add a new policy?",
      answer: "To add a new policy, click on the 'Add Policy' button in the navigation bar. Fill out all the required fields in the form and click 'Create Policy'. Your new policy will be added to the system and visible in the policies list.",
      category: "general"
    },
    {
      question: "How do I edit an existing policy?",
      answer: "To edit a policy, go to the Policies page, find the policy you want to edit, and click the 'Edit' button (pencil icon). Make your changes in the edit form and save.",
      category: "general"
    },
    {
      question: "How do reminders work?",
      answer: "The system automatically shows policies that are expiring within the next 30 days on the Reminders page. You can send WhatsApp reminders to clients from this page by clicking the 'Send Reminder' button on a policy card.",
      category: "reminders"
    },
    {
      question: "What should I do with lapsed policies?",
      answer: "If a policy has lapsed, you can mark it as lapsed from the Reminders page. Click the 'Mark as Lapsed' button, provide a reason, and the policy will be moved to the Lapsed Policies section.",
      category: "policies"
    },
    {
      question: "How do I filter policies by year?",
      answer: "On the Policies page, use the 'Policy Year' dropdown to filter policies by their start year. This helps you view policies from specific time periods.",
      category: "policies"
    },
    {
      question: "How do I search for a specific policy?",
      answer: "Use the search box on the Policies page to search by policyholder name, policy number, mobile number, email, or any other policy field. The search will find matching results across all fields.",
      category: "policies"
    },
    {
      question: "I accidentally deleted a policy. How do I restore it?",
      answer: "Go to the Restore page in the navigation menu. There you'll see all deleted policies. Find the policy you want to restore and click the 'Restore' button.",
      category: "troubleshooting"
    },
    {
      question: "What is the difference between policy types?",
      answer: "The system supports various policy types such as Health, Vehicle, Life, and more. Each type has specific fields relevant to that insurance type. For example, Vehicle insurance includes vehicle registration details.",
      category: "policies"
    },
    {
      question: "How do I change my password?",
      answer: "Currently, password changes must be done by the system administrator. Please contact your administrator to request a password change.",
      category: "account"
    },
    {
      question: "What happens to deleted policies?",
      answer: "When you delete a policy, it's not permanently removed but moved to a deleted items section. You can restore it from the Restore page if needed. Only administrators can permanently delete policies.",
      category: "troubleshooting"
    }
  ];

  // Categories for FAQs
  const categories = [
    { id: 'general', name: 'General Questions', icon: <HelpCircle className="h-5 w-5" /> },
    { id: 'policies', name: 'Policy Management', icon: <FileText className="h-5 w-5" /> },
    { id: 'reminders', name: 'Reminders & Notifications', icon: <Bell className="h-5 w-5" /> },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: <AlertTriangle className="h-5 w-5" /> },
    { id: 'account', name: 'Account & Settings', icon: <User className="h-5 w-5" /> }
  ];

  // Filter FAQs by active category
  const filteredFaqs = activeCategory 
    ? faqs.filter(faq => faq.category === activeCategory) 
    : faqs;

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    
    // This is a placeholder for actual submission logic
    // In a real system, you would send this to a backend API
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear form
      setSubject('');
      setMessage('');
      
      toast.success('Support request submitted successfully!');
    } catch (_) {
      toast.error('Failed to submit support request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support & Help Center</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Get help with OnClicks Policy Manager policy management system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - FAQs */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-200">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-blue-500" />
                  Frequently Asked Questions
                </h2>
              </div>
              
              {/* FAQ Categories */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      className={`px-4 py-2 rounded-full text-sm font-medium flex items-center ${
                        activeCategory === category.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-650'
                      }`}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      <span className="mr-1.5">{category.icon}</span>
                      {category.name}
                    </button>
                  ))}
                  <button
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center ${
                      activeCategory === null
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-650'
                    }`}
                    onClick={() => setActiveCategory(null)}
                  >
                    <Globe className="h-4 w-4 mr-1.5" />
                    All FAQs
                  </button>
                </div>
              </div>
              
              {/* FAQ Items */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, index) => (
                    <div key={index} className="px-6 py-4">
                      <button
                        className="w-full flex justify-between items-center text-left"
                        onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      >
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{faq.question}</h3>
                        {expandedFaq === index ? (
                          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                      {expandedFaq === index && (
                        <div className="mt-3 text-gray-600 dark:text-gray-300 pl-4 border-l-2 border-blue-300 dark:border-blue-700">
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No FAQs found</h3>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Try selecting a different category</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Contact & Support */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-blue-500" />
                  Contact Information
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Phone</h3>
                    <p className="text-gray-600 dark:text-gray-300">Contact your administrator</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email</h3>
                    <p className="text-gray-600 dark:text-gray-300">support@onclicks.in</p>
                    <p className="text-gray-600 dark:text-gray-300">info@onclicks.in</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MessageCircle className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Live Chat</h3>
                    <p className="text-gray-600 dark:text-gray-300">Available Monday to Friday</p>
                    <p className="text-gray-600 dark:text-gray-300">9:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Form */}
            <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-blue-500" />
                  Submit a Support Request
                </h2>
              </div>
              <div className="px-6 py-4">
                <form onSubmit={handleSubmitSupport}>
                  <div className="mb-4">
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="What do you need help with?"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Please provide details about your issue or question..."
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sharp transition-colors duration-200 ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      'Submitting...'
                    ) : (
                      <>
                        Submit Request
                        <Send className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Documentation Links */}
            <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Documentation
                </h2>
              </div>
              <div className="px-6 py-4 space-y-2">
                <a 
                  href="#" 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-sharp hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors duration-200"
                >
                  <span className="text-gray-900 dark:text-white">User Manual</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </a>
                <a 
                  href="#" 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-sharp hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors duration-200"
                >
                  <span className="text-gray-900 dark:text-white">API Documentation</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </a>
                <a 
                  href="#" 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-sharp hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors duration-200"
                >
                  <span className="text-gray-900 dark:text-white">Video Tutorials</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
