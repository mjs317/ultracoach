import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent you a sign-in link. You can close this tab once you click it.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Didn&apos;t get anything in a minute or two? Check spam, or try again.
        </CardContent>
      </Card>
    </div>
  );
}
