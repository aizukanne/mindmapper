import { SignIn as ClerkSignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export default function SignIn() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-8 text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-primary">
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
          MindMapper
        </Link>
        <p className="mt-2 text-muted-foreground">
          Sign in to create and collaborate on mind maps
        </p>
      </div>

      <ClerkSignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl',
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
      />

      <p className="mt-8 text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/sign-up" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
