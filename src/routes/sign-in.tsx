import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { errorMessage } from "#/lib/utils";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});

type Step = "signIn" | "signUp" | "reset" | "reset-verification";

function SignInPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: (redirect ?? "/") as any });
    }
  }, [isLoading, isAuthenticated, navigate, redirect]);

  async function handlePasswordFlow(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setWorking(true);
    try {
      if (step === "signIn" || step === "signUp") {
        await signIn("password", { email, password, flow: step });
      } else if (step === "reset") {
        await signIn("password", { email, flow: "reset" });
        setStep("reset-verification");
      } else {
        await signIn("password", { email, code, newPassword, flow: "reset-verification" });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <span className="inline-flex w-11 h-11 rounded-2xl bg-ink text-paper items-center justify-center font-display font-bold text-lg mb-3">
            C
          </span>
          <h1 className="text-xl font-bold text-zinc-900">
            {step === "signIn" && "Sign in"}
            {step === "signUp" && "Create an account"}
            {step === "reset" && "Reset your password"}
            {step === "reset-verification" && "Check your email"}
          </h1>
        </div>

        {(step === "signIn" || step === "signUp") && (
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={() => void signIn("google", { redirectTo: redirect ?? "/" })}
          >
            Continue with Google
          </Button>
        )}

        {(step === "signIn" || step === "signUp") && (
          <div className="relative mb-4 text-center text-[12px] text-zinc-400">
            <span className="bg-white px-2 relative z-10">or</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-200" />
          </div>
        )}

        <form onSubmit={handlePasswordFlow} className="space-y-3">
          {step !== "reset-verification" && (
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          )}
          {(step === "signIn" || step === "signUp") && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          {step === "reset-verification" && (
            <>
              <Input
                placeholder="Reset code from your email"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" variant="ink" className="w-full" disabled={working}>
            {working
              ? "Please wait…"
              : step === "signIn"
                ? "Sign in"
                : step === "signUp"
                  ? "Create account"
                  : step === "reset"
                    ? "Send reset code"
                    : "Reset password"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-zinc-500 space-y-1.5">
          {step === "signIn" && (
            <>
              <button className="hover:text-zinc-800" onClick={() => setStep("reset")}>
                Forgot password?
              </button>
              <div>
                No account?{" "}
                <button className="font-semibold text-zinc-800" onClick={() => setStep("signUp")}>
                  Sign up
                </button>
              </div>
            </>
          )}
          {step !== "signIn" && (
            <button className="hover:text-zinc-800" onClick={() => setStep("signIn")}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
