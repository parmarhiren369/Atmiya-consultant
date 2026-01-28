import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, Lock } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
  requirePassword?: boolean;
  requireAdminRole?: boolean;
  expectedPassword?: string;
  onPasswordValidation?: (password: string) => Promise<boolean>;
  currentUserRole?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  requirePassword = false,
  requireAdminRole = false,
  expectedPassword,
  onPasswordValidation,
  currentUserRole
}: ConfirmationModalProps) {
  const [password, setPassword] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [roleError, setRoleError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setPasswordError('');
      setRoleError('');
      setIsValidating(false);
      // Focus the password input when modal opens
      if (requirePassword) {
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, requirePassword]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError('');
  };

  const handleConfirm = async () => {
    // Check for admin role requirement
    if (requireAdminRole && currentUserRole !== 'admin') {
      setRoleError('This action requires admin privileges');
      return;
    }

    // Password validation
    if (requirePassword) {
      if (password.length === 0) {
        setPasswordError('Please enter your password');
        return;
      }

      setIsValidating(true);
      setPasswordError('');
      
      try {
        let isValid = false;
        
        if (onPasswordValidation) {
          isValid = await onPasswordValidation(password);
        } else if (expectedPassword) {
          isValid = password === expectedPassword;
        }
        
        if (!isValid) {
          setPasswordError('Incorrect password');
          setIsValidating(false);
          return;
        }
      } catch {
        setPasswordError('Password validation failed');
        setIsValidating(false);
        return;
      } finally {
        setIsValidating(false);
      }
    }
    
    onConfirm();
  };

  if (!isOpen) return null;

  const typeStyles = {
    warning: {
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600'
    },
    danger: {
      iconColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      buttonColor: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
    }
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${styles.bgColor} ${styles.borderColor} rounded-full p-2 border`}>
              <AlertTriangle className={`h-6 w-6 ${styles.iconColor}`} />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {message}
              </p>

              {/* Admin role requirement error */}
              {requireAdminRole && currentUserRole !== 'admin' && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="font-medium">Admin privileges required</p>
                  <p className="text-sm mt-1">Only administrators can perform this action.</p>
                </div>
              )}

              {/* Password requirement */}
              {requirePassword && (
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleConfirm(); }} 
                  className="mb-4"
                  data-modal-form="true"
                  autoComplete="off"
                >
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Lock className="inline h-4 w-4 mr-1" />
                    Enter your password to confirm:
                  </label>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                      passwordError
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter password"
                    disabled={isValidating}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="modal-confirmation-password"
                    id="modal-confirmation-password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirm();
                      }
                    }}
                  />
                  {passwordError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                  )}
                  {isValidating && (
                    <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">Validating password...</p>
                  )}
                </form>
              )}
              
              {roleError && (
                <p className="mb-4 text-sm text-red-600 dark:text-red-400">{roleError}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isValidating}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 ${styles.buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isValidating ? 'Validating...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
