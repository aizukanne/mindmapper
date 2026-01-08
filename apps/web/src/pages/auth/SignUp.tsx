import { SignUp as ClerkSignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export default function SignUp() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 sm:p-6 md:p-8">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 dark:bg-primary-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl" />
      </div>

      {/* Content container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and header section */}
        <div className="mb-8 text-center animate-fade-in">
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-2xl sm:text-3xl font-bold text-primary hover:opacity-80 transition-opacity duration-200"
          >
            <div className="p-2 bg-primary/10 rounded-xl">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <circle cx="4" cy="8" r="2" />
                <circle cx="20" cy="8" r="2" />
                <circle cx="4" cy="16" r="2" />
                <circle cx="20" cy="16" r="2" />
                <line x1="9" y1="10" x2="6" y2="8" />
                <line x1="15" y1="10" x2="18" y2="8" />
                <line x1="9" y1="14" x2="6" y2="16" />
                <line x1="15" y1="14" x2="18" y2="16" />
              </svg>
            </div>
            <span className="gradient-text">MindMapper</span>
          </Link>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            Create your free account to start mapping ideas
          </p>
        </div>

        {/* Clerk SignUp component with custom styling */}
        <div className="animate-scale-in">
          <ClerkSignUp
            appearance={{
              elements: {
                rootBox: 'mx-auto w-full',
                card: 'shadow-xl border border-border bg-card/95 backdrop-blur-sm rounded-2xl',
                headerTitle: 'text-foreground font-display font-semibold',
                headerSubtitle: 'text-muted-foreground',
                socialButtonsBlockButton:
                  'border border-border bg-background hover:bg-muted transition-colors duration-200 text-foreground font-medium rounded-lg',
                socialButtonsBlockButtonText: 'font-medium text-foreground',
                dividerLine: 'bg-border',
                dividerText: 'text-muted-foreground text-sm',
                formFieldLabel: 'text-foreground font-medium text-sm',
                formFieldInput:
                  'border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary rounded-lg',
                formButtonPrimary:
                  'bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md',
                footerActionLink: 'text-primary hover:text-primary/80 font-medium transition-colors',
                identityPreviewEditButton: 'text-primary hover:text-primary/80',
                formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
                otpCodeFieldInput: 'border-input bg-background text-foreground',
                formResendCodeLink: 'text-primary hover:text-primary/80',
                alert: 'bg-destructive/10 border border-destructive/20 text-destructive rounded-lg',
                alertText: 'text-destructive text-sm',
                footer: 'hidden',
              },
              variables: {
                colorPrimary: 'hsl(221.2, 83.2%, 53.3%)',
                colorBackground: 'hsl(0, 0%, 100%)',
                colorText: 'hsl(222.2, 84%, 4.9%)',
                colorTextSecondary: 'hsl(215.4, 16.3%, 46.9%)',
                colorInputBackground: 'hsl(0, 0%, 100%)',
                colorInputText: 'hsl(222.2, 84%, 4.9%)',
                borderRadius: '0.5rem',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
            }}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl="/"
            fallbackRedirectUrl="/"
          />
        </div>

        {/* Custom footer with sign-in link */}
        <p className="mt-6 text-center text-sm text-muted-foreground animate-fade-in">
          Already have an account?{' '}
          <Link
            to="/sign-in"
            className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>

        {/* Additional helper text */}
        <p className="mt-4 text-center text-xs text-muted-foreground/70 animate-fade-in">
          By creating an account, you agree to our{' '}
          <a href="#" className="hover:text-muted-foreground underline underline-offset-2">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="hover:text-muted-foreground underline underline-offset-2">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
