import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);

    try {
      await apiRequest("POST", "/api/auth/register-link", { username, email });
      setStatus("sent");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "Failed to send registration link");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Choose a username and enter your email. We’ll send you a link to finish signing up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm" htmlFor="username">
                  Username
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourname"
                  required
                />
              </div>

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
                  Check your email to finish creating your account.
                </p>
              ) : null}

              {status === "error" ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send link"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <a className="underline" href="/login">Log in</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
