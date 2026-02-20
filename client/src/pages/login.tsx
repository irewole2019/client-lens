import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);

    try {
      await apiRequest("POST", "/api/auth/login-link", { email });
      setStatus("sent");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "Failed to send sign-in link");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Log in</CardTitle>
            <CardDescription>
              Enter your email and we’ll send you a sign-in link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {status === "sent" ? (
                <p className="text-sm text-muted-foreground">
                  Check your email for a sign-in link.
                </p>
              ) : null}

              {status === "error" ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send link"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                New here? <a className="underline" href="/register">Create an account</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
