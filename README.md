# 🛡️ OnClicks Policy Manager

**Smart Insurance Policy Management System**

A comprehensive, modern web application for managing insurance policies, leads, claims, and team collaboration. Built for insurance professionals who need efficient policy tracking, document management, and client relationship management.

---

## 🌟 Features

### 📋 Policy Management
- **Complete Policy Lifecycle** - Add, edit, view, and manage insurance policies
- **Document Storage** - Secure cloud storage for policy documents
- **Smart Reminders** - Automated renewal and premium payment alerts
- **Lapsed Policies Tracking** - Monitor and manage expired policies
- **Policy Restoration** - Recover deleted policies with audit trail

### 👥 Lead Management
- **Lead Tracking** - Comprehensive lead management system
- **Follow-up System** - Schedule and track follow-ups
- **Lead Status Management** - Track conversion pipeline
- **Client Folders** - Organize documents by client

### 💼 Claims Management
- **Claims Tracking** - Monitor insurance claims status
- **Document Management** - Store and organize claim documents
- **Status Updates** - Track claim progression

### 💰 Commission Tracking
- **Commission Management** - Track agent commissions
- **Payment History** - Monitor commission payments
- **Revenue Analytics** - Financial insights

### 👨‍💼 Team Collaboration
- **Team Members** - Add team members with role-based access
- **Permission System** - Granular page-level permissions
- **Task Management** - Assign and track tasks
- **Activity Logs** - Complete audit trail

### 📊 Analytics & Reporting
- **Dashboard** - Real-time insights and metrics
- **Reports** - Generate comprehensive reports
- **Data Visualization** - Charts and graphs

### 🎨 User Experience
- **Dark Mode** - Eye-friendly dark theme
- **Responsive Design** - Mobile, tablet, and desktop support
- **Modern UI** - Clean and intuitive interface
- **Fast Performance** - Optimized with Vite

---

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icons

### Backend & Services
- **Firebase Authentication** - Secure user authentication
- **Cloud Firestore** - NoSQL database
- **Firebase Storage** - Cloud file storage
- **Firebase Admin SDK** - Server-side operations

### Additional Tools
- **React Hot Toast** - Elegant notifications
- **Chart.js** - Data visualization
- **date-fns** - Date manipulation
- **bcryptjs** - Password hashing

---

## 📦 Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Firebase Project** (for backend services)

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd "On Clicks"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# ================== FIREBASE ==================
# Get these from Firebase Console > Project Settings > Your apps > Web app
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# ================== N8N WEBHOOKS (Optional) ==================
# PDF AI Extraction webhook
VITE_N8N_WEBHOOK_URL=

# Subscription creation webhook
VITE_N8N_SUBSCRIPTION_WEBHOOK_URL=
```

### Step 4: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Authentication** (Email/Password)
4. Create a **Firestore Database**
5. Enable **Storage**
6. Copy your web app credentials to `.env`

### Step 5: Deploy Firestore Rules

Copy the contents of `firestore.rules` to your Firebase Console:
- Firestore Database > Rules > Paste and Publish

Copy the contents of `storage.rules` to your Firebase Console:
- Storage > Rules > Paste and Publish

---

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

## 📁 Project Structure

```
On Clicks/
├── public/                 # Static assets
│   ├── onclicks.ico       # Favicon
│   └── onclickslogin.png  # Logo
├── src/
│   ├── components/        # React components
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── ...
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Policies.tsx
│   │   ├── Login.tsx
│   │   └── ...
│   ├── services/         # API & Firebase services
│   │   ├── policyService.ts
│   │   ├── userService.ts
│   │   ├── firebaseAuthService.ts
│   │   └── ...
│   ├── context/          # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── PolicyContext.tsx
│   │   └── ThemeContext.tsx
│   ├── config/           # Configuration
│   │   ├── firebase.ts
│   │   └── webhookConfig.ts
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── .env                  # Environment variables (not in git)
├── .gitignore           # Git ignore rules
├── firestore.rules      # Firestore security rules
├── storage.rules        # Storage security rules
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
├── tailwind.config.js   # Tailwind config
└── README.md            # This file
```

---

## 🔐 User Roles & Permissions

### Admin
- Full system access
- User management
- Team member creation
- System configuration

### User (Agent)
- Manage own policies
- Manage leads
- Track commissions
- View personal analytics

### Team Member
- Limited access based on permissions
- Assigned page access
- Task management
- View assigned data

---

## 🔒 Security Features

- **Firebase Authentication** - Secure user login
- **Role-Based Access Control** - Granular permissions
- **Firestore Security Rules** - Database-level security
- **Storage Rules** - Secure file access
- **Activity Logging** - Complete audit trail
- **Subscription Status Checks** - Access control
- **Password Hashing** - bcryptjs encryption

---

## 📱 Responsive Design

The application is fully responsive and works seamlessly on:
- 📱 Mobile devices (iOS & Android)
- 📱 Tablets (iPad, Android tablets)
- 💻 Desktop computers (Windows, Mac, Linux)
- 🖥️ Large displays (up to 4K)

---

## 🌙 Dark Mode

Built-in dark mode support:
- Toggle between light and dark themes
- Persisted user preference
- Eye-friendly color schemes
- Smooth transitions

---

## 🛠️ Development

### Code Structure
- **TypeScript** for type safety
- **React Hooks** for state management
- **Context API** for global state
- **Custom Hooks** for reusable logic
- **Service Layer** for business logic

### Best Practices
- ✅ Component-based architecture
- ✅ Clean code principles
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design
- ✅ Accessibility considerations

---

## 🚨 Troubleshooting

### White Screen on Load
**Issue:** Application shows white screen  
**Solution:** Check if `.env` file has valid Firebase credentials

### Firebase Connection Error
**Issue:** Cannot connect to Firebase  
**Solution:** Verify Firebase project is active and credentials are correct

### Build Errors
**Issue:** Build fails with TypeScript errors  
**Solution:** Run `npm install` to ensure all dependencies are installed

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 👨‍💻 Support

For support, please contact the development team or visit the Support page within the application.

---

## 🎯 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Email notifications
- [ ] SMS reminders
- [ ] PDF report generation
- [ ] Multi-language support
- [ ] API for third-party integrations

---

**Built with ❤️ for Insurance Professionals**