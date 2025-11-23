# Canvas Chatbot - Deployment Guide

## 🚀 Project Overview

The Canvas Chatbot has been successfully transformed from a Flask prototype into a full-stack Next.js application with the following features:

- **Authentication**: User registration and login with Supabase
- **Canvas Integration**: Secure API key management and Canvas LMS integration
- **AI Chat**: LangChain integration with Google Gemini for conversational AI
- **File Upload**: Support for PDF and text file processing
- **Responsive Design**: Modern UI with Tailwind CSS
- **Security**: Rate limiting, input validation, and encrypted API keys

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Supabase Account**: Set up a project at [supabase.com](https://supabase.com)
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Google Gemini API Key**: Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. **Canvas API Access**: Users need their Canvas institution URL and API token

## 🔧 Environment Variables

Set these environment variables in your Vercel project:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Security
ENCRYPTION_KEY=your_32_character_encryption_key

# AI Integration
GEMINI_API_KEY=your_google_gemini_api_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

## 🚀 Deployment Steps

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### 2. Configure Environment Variables

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all the variables listed above

### 3. Set up Supabase Database

The database schema has been created and applied. The migration includes:
- User profiles table
- Chat sessions and messages
- Canvas API cache
- File uploads storage
- Rate limiting

### 4. Enable Authentication

In your Supabase project:
1. Go to Authentication settings
2. Enable Email authentication
3. Configure email templates if needed

## 🧪 Testing

The application includes comprehensive tests:

### Unit Tests
```bash
npm test
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## 📁 Project Structure

```
canvas-chatbot-next/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── chat/              # Chat interface
│   │   ├── login/             # Authentication
│   │   └── page.tsx           # Landing page
│   ├── lib/                   # Utility libraries
│   │   ├── ai-assistant.ts    # LangChain integration
│   │   ├── canvas-api.ts      # Canvas API service
│   │   ├── canvas-context.ts  # Context building
│   │   ├── crypto.ts          # Encryption utilities
│   │   ├── rate-limit.ts      # Rate limiting
│   │   └── supabase.ts        # Database client
│   └── middleware.ts          # Authentication middleware
├── supabase/
│   └── migrations/            # Database migrations
├── e2e/                       # End-to-end tests
├── src/lib/__tests__/         # Unit tests
└── vercel.json               # Vercel configuration
```

## 🔒 Security Features

- **Encrypted API Keys**: Canvas tokens are encrypted using AES-256-CBC
- **Rate Limiting**: Prevents API abuse with configurable limits
- **Input Validation**: All user inputs are validated
- **Row Level Security**: Supabase RLS policies protect user data
- **Secure Headers**: Security headers configured in Vercel

## 🎯 Key Features Implemented

### Authentication
- ✅ User registration and login
- ✅ Canvas API key configuration
- ✅ Secure session management

### Canvas Integration
- ✅ Course data fetching
- ✅ Assignment and grade information
- ✅ Module and file access
- ✅ Context-aware responses

### AI Chat
- ✅ LangChain integration
- ✅ Google Gemini AI
- ✅ Message history
- ✅ File upload support

### UI/UX
- ✅ Responsive design
- ✅ Real-time chat interface
- ✅ File upload functionality
- ✅ Settings and configuration

### Testing
- ✅ Unit tests for core utilities
- ✅ Component tests
- ✅ End-to-end tests (marked as todo for crypto test)
- ✅ CI/CD pipeline configured

## 🚀 Next Steps

1. **Deploy to Production**: Follow the deployment steps above
2. **Test Canvas Integration**: Verify with real Canvas credentials
3. **Monitor Performance**: Set up monitoring and analytics
4. **Scale as Needed**: Configure auto-scaling in Vercel
5. **User Feedback**: Collect and implement user feedback

## 📞 Support

For issues or questions:
- Check the test suite for examples
- Review the API documentation
- Examine the database schema in Supabase
- Check Vercel deployment logs

## 🎉 Success!

The Canvas Chatbot transformation is complete! The application is ready for deployment and provides a robust, secure, and scalable solution for Canvas LMS integration with AI-powered conversational assistance.