import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-dark-100 sm:text-5xl">
          Athens Pickleball
        </h1>
        <p className="max-w-lg mx-auto text-lg text-surface-muted">
          Sign up for shootouts, track your rankings, and connect with the local pickleball community.
        </p>
      </div>

      <div className="flex gap-4">
        {isLoggedIn ? (
          <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn-primary px-6 py-3 text-base">
              Log In
            </Link>
            <Link href="/register" className="btn-secondary px-6 py-3 text-base">
              Create Account
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 w-full max-w-2xl mt-8">
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-500">Sign Up</p>
          <p className="mt-1 text-sm text-surface-muted">
            Register for upcoming shootout events
          </p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-500">Compete</p>
          <p className="mt-1 text-sm text-surface-muted">
            Play matches and climb the rankings
          </p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-500">Connect</p>
          <p className="mt-1 text-sm text-surface-muted">
            Join groups and meet local players
          </p>
        </div>
      </div>
    </div>
  );
}
