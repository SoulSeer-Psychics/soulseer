#!/bin/bash

# SoulSeer App - Production Deployment Script
# This script prepares the application for production deployment

set -e  # Exit on any error

echo "🔮 SoulSeer App - Production Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher (current: $(node --version))"
        exit 1
    fi
    
    # Check npm/yarn
    if ! command -v npm &> /dev/null && ! command -v yarn &> /dev/null; then
        print_error "npm or yarn is required"
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git is required"
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Validate environment variables
validate_env() {
    print_status "Validating environment variables..."
    
    # Critical environment variables
    REQUIRED_VARS=(
        "DATABASE_URL"
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY"
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        "STRIPE_SECRET_KEY"
        "NEXT_PUBLIC_AGORA_APP_ID"
        "AGORA_APP_CERTIFICATE"
        "NEXT_PUBLIC_ABLY_PUBLISHABLE_KEY"
        "ABLY_SECRET_KEY"
    )
    
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        print_warning "Please check your .env.local file or Vercel environment variables"
        exit 1
    fi
    
    print_success "Environment variables validated"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        npm run test || {
            print_error "Tests failed"
            exit 1
        }
        print_success "All tests passed"
    else
        print_warning "No tests found"
    fi
}

# Build the application
build_app() {
    print_status "Building application..."
    
    # Install dependencies
    if [ -f "yarn.lock" ]; then
        yarn install --frozen-lockfile
    else
        npm ci
    fi
    
    # Build the app
    npm run build || {
        print_error "Build failed"
        exit 1
    }
    
    print_success "Application built successfully"
}

# Run security checks
security_checks() {
    print_status "Running security checks..."
    
    # Check for common security issues
    npm audit --audit-level moderate || {
        print_warning "Security vulnerabilities found. Run 'npm audit fix' to resolve."
    }
    
    # Check for exposed secrets (basic check)
    if grep -r "sk_live_\|pk_live_\|whsec_" --include="*.js" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . 2>/dev/null; then
        print_error "Potential exposed API keys found in source code"
        exit 1
    fi
    
    print_success "Security checks completed"
}

# Database migration check
check_database() {
    print_status "Checking database connectivity..."
    
    # This would typically run a connection test
    # For now, just check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL not set"
        exit 1
    fi
    
    print_success "Database configuration verified"
}

# Validate Stripe configuration
validate_stripe() {
    print_status "Validating Stripe configuration..."
    
    if [[ "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" == pk_test_* ]]; then
        print_warning "Using Stripe test keys in production"
    fi
    
    if [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
        print_warning "Using Stripe test secret key in production"
    fi
    
    print_success "Stripe configuration validated"
}

# Performance optimization checks
performance_checks() {
    print_status "Running performance checks..."
    
    # Check bundle size
    if [ -d ".next" ]; then
        BUNDLE_SIZE=$(du -sh .next | cut -f1)
        print_status "Build size: $BUNDLE_SIZE"
        
        # Check for large bundles (basic check)
        BUNDLE_SIZE_MB=$(du -sm .next | cut -f1)
        if [ "$BUNDLE_SIZE_MB" -gt 100 ]; then
            print_warning "Build size is large (${BUNDLE_SIZE_MB}MB). Consider optimization."
        fi
    fi
    
    print_success "Performance checks completed"
}

# SEO and metadata validation
validate_seo() {
    print_status "Validating SEO configuration..."
    
    # Check for essential files
    if [ ! -f "public/robots.txt" ]; then
        print_warning "robots.txt not found"
    fi
    
    if [ ! -f "public/sitemap.xml" ] && [ ! -f "app/sitemap.ts" ]; then
        print_warning "Sitemap not found"
    fi
    
    print_success "SEO validation completed"
}

# Deployment preparation
prepare_deployment() {
    print_status "Preparing for deployment..."
    
    # Create deployment info file
    cat > deployment-info.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "$(git rev-parse HEAD)",
  "branch": "$(git rev-parse --abbrev-ref HEAD)",
  "nodeVersion": "$(node --version)",
  "buildHash": "$(date +%s | sha256sum | head -c 8)"
}
EOF
    
    print_success "Deployment preparation completed"
}

# Main execution
main() {
    echo
    print_status "Starting production deployment preparation..."
    echo
    
    check_dependencies
    echo
    
    # Only validate env if not in CI/CD environment
    if [ -z "$CI" ]; then
        validate_env
        echo
    fi
    
    run_tests
    echo
    
    build_app
    echo
    
    security_checks
    echo
    
    check_database
    echo
    
    validate_stripe
    echo
    
    performance_checks
    echo
    
    validate_seo
    echo
    
    prepare_deployment
    echo
    
    print_success "🎉 Application is ready for production deployment!"
    echo
    
    print_status "Next steps:"
    echo "1. Deploy to Vercel: vercel --prod"
    echo "2. Set up monitoring and alerts"
    echo "3. Configure DNS and SSL certificates"
    echo "4. Set up backup procedures"
    echo "5. Test all integrations in production"
    echo
    
    print_status "Important post-deployment tasks:"
    echo "• Verify webhook endpoints are working"
    echo "• Test payment processing end-to-end"
    echo "• Confirm Agora/Ably real-time features"
    echo "• Check Stripe Connect for reader payouts"
    echo "• Monitor error tracking and performance"
    echo
}

# Handle script arguments
case "$1" in
    "check-env")
        validate_env
        ;;
    "build-only")
        build_app
        ;;
    "security-only")
        security_checks
        ;;
    *)
        main
        ;;
esac
