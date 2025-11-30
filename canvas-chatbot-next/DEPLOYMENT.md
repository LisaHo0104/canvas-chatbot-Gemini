# Canvas Chatbot Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Canvas Chatbot application to production using Vercel.

## Prerequisites
- Node.js 18+ installed locally
- Git repository set up
- Vercel account (https://vercel.com)
- Supabase account (https://supabase.com)
- Google Gemini API key
- Canvas API credentials

## Environment Setup

### 1. Supabase Configuration
1. Create a new Supabase project
2. Navigate to SQL Editor and run the migration script from `supabase/migrations/20240101000000_initial_schema.sql`
3. Go to Settings > API and copy:
   - Project URL (for `NEXT_PUBLIC_SUPABASE_URL`)
   - anon key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - service role key (for `SUPABASE_SERVICE_ROLE_KEY`)

### 2. Google Gemini API
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key for `GEMINI_API_KEY`

### 3. Canvas API Setup
1. Log into your Canvas instance
2. Go to Account > Settings > Approved Integrations
3. Generate a new API token
4. Test the token with your Canvas instance

## Local Development Setup

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd canvas-chatbot-next
npm install
```

### 2. Environment Variables
Create `.env.local` file:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Encryption (generate a 32-character key)
ENCRYPTION_KEY=your_32_character_encryption_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
```

### 3. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000 to test locally.

## Vercel Deployment

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Link Project
```bash
vercel link
```
Follow prompts to link your Git repository.

### 4. Configure Environment Variables
In Vercel dashboard:
1. Go to Project Settings > Environment Variables
2. Add all variables from `.env.local`
3. For sensitive values, use Vercel Secrets:
   ```bash
   vercel secret add encryption_key your_32_character_key
   vercel secret add supabase_service_role_key your_service_role_key
   vercel secret add gemini_api_key your_gemini_api_key
   ```

### 5. Deploy
```bash
vercel --prod
```

## GitHub Actions CI/CD

The project includes automated deployment via GitHub Actions.

### 1. Repository Secrets
Add these secrets in GitHub Settings > Secrets and Variables > Actions:
- `VERCEL_TOKEN` - Your Vercel token (from Account Settings > Tokens)
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### 2. Workflow Triggers
- **Test**: Runs on all PRs and pushes to main/develop
- **Deploy**: Runs only on pushes to main branch

### 3. Manual Deployment
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Post-Deployment Verification

### 1. Health Check
Visit your deployed URL and verify:
- Landing page loads correctly
- Login/signup functionality works
- Canvas API integration functions
- Chat interface responds properly

### 2. Security Verification
- All API endpoints return appropriate responses
- Rate limiting is working (test with multiple rapid requests)
- Authentication redirects work correctly
- File upload size limits are enforced

### 3. Performance Check
- Page load times are under 3 seconds
- API responses are within acceptable limits
- Database queries are optimized
- Static assets are properly cached

## Monitoring and Maintenance

### 1. Vercel Analytics
Enable Vercel Analytics in your project dashboard to monitor:
- Page views and user sessions
- Performance metrics
- Error rates
- Core Web Vitals

### 2. Supabase Monitoring
Monitor your Supabase project for:
- Database performance
- Authentication events
- API usage
- Storage usage

### 3. Error Tracking
Consider integrating error tracking tools like:
- Sentry for frontend error tracking
- Vercel's built-in error logs
- Supabase edge function logs

## Troubleshooting

### Common Issues

**Build Failures**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for TypeScript errors: `npm run typecheck`

**Authentication Issues**
- Verify Supabase configuration
- Check CORS settings in Supabase
- Ensure environment variables are correct

**Canvas API Errors**
- Verify Canvas API token validity
- Check Canvas instance URL format
- Ensure proper permissions in Canvas

**Rate Limiting**
- Adjust `RATE_LIMIT_MAX_REQUESTS` if needed
- Check server logs for blocked requests
- Verify rate limiting middleware is working

### Support Resources
- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Canvas API Documentation: https://canvas.instructure.com/doc/api/

## Security Considerations

### Production Security Checklist
- [ ] All environment variables are properly set
- [ ] Encryption keys are secure and backed up
- [ ] Rate limiting is configured appropriately
- [ ] Input validation is working
- [ ] File upload restrictions are in place
- [ ] API keys are properly encrypted
- [ ] Database access is restricted
- [ ] HTTPS is enforced
- [ ] Security headers are configured

### Regular Maintenance
- Monitor for security updates
- Review access logs regularly
- Update dependencies monthly
- Review and rotate API keys quarterly
- Backup encryption keys securely
- Monitor usage patterns for anomalies

## Scaling Considerations

### Performance Optimization
- Implement caching strategies
- Optimize database queries
- Use CDN for static assets
- Monitor and optimize bundle sizes

### Cost Management
- Monitor Vercel usage
- Optimize Supabase queries
- Implement efficient rate limiting
- Use appropriate hosting tier

---

For additional support, refer to the project documentation or create an issue in the repository.