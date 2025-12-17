import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ronin-ui-theme">
      <div className="min-h-screen bg-background p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground font-serif">
            Ronin
          </h1>
          <ModeToggle />
        </header>

        {/* Typography Demo */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Typography System</h2>
          <div className="space-y-4">
            <p className="font-sans">
              <strong>Work Sans (Sans):</strong> The quick brown fox jumps over the lazy dog.
            </p>
            <p className="font-mono">
              <strong>JetBrains Mono (Mono):</strong> const ronin = "masterless";
            </p>
            <p className="font-serif">
              <strong>Libre Baskerville (Serif):</strong> A warrior without a master.
            </p>
          </div>
        </section>

        {/* Color Demo */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ronin Brand Colors</h2>
          <div className="flex gap-4 flex-wrap">
            <div className="w-24 h-24 rounded-lg bg-ronin-brass flex items-center justify-center text-white text-xs font-medium">
              Brass
            </div>
            <div className="w-24 h-24 rounded-lg bg-ronin-gray flex items-center justify-center text-white text-xs font-medium">
              Gray
            </div>
            <div className="w-24 h-24 rounded-lg bg-ronin-cararra flex items-center justify-center text-ronin-cod text-xs font-medium border">
              Cararra
            </div>
            <div className="w-24 h-24 rounded-lg bg-ronin-cod flex items-center justify-center text-ronin-cararra text-xs font-medium">
              Cod
            </div>
          </div>
        </section>

        {/* Components Demo */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">shadcn/ui Components</h2>

          {/* Buttons */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Buttons</h3>
            <div className="flex gap-3 flex-wrap">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          {/* Badges */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Badges</h3>
            <div className="flex gap-3 flex-wrap">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </div>

          {/* Input */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Input</h3>
            <div className="max-w-sm">
              <Input placeholder="Type something..." />
            </div>
          </div>

          {/* Card */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Card</h3>
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="font-serif">Project: Ronin</CardTitle>
                <CardDescription>A masterless warrior's companion</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This card demonstrates the Ronin design system with custom typography and brand colors.
                </p>
                <code className="mt-3 block font-mono text-xs bg-muted p-2 rounded">
                  git status: clean
                </code>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">Take the Oath</Button>
                <Button size="sm" variant="outline">Learn More</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Theme Status */}
        <section className="text-sm text-muted-foreground">
          <p>Design system configured. Toggle the theme using the button in the header.</p>
        </section>
      </div>
    </ThemeProvider>
  )
}

export default App
