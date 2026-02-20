import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-end px-6">
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="/login">Login</a>
            </Button>
            <Button size="sm" asChild>
              <a href="/register">Register</a>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Client Lens
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Collect clear, contextual feedback through simple shareable links.
          </p>
        </div>
      </main>
    </div>
  );
}
