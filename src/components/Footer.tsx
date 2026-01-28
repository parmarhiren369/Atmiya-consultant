export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Made by{' '}
            <span className="font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent relative group cursor-pointer transition-all duration-300 hover:scale-105">
              <span className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-indigo-400/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              SENTIMENT AI
            </span>{' '}
            • All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
