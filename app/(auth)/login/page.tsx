"use client";

import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  function initGoogleSignIn() {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      use_fedcm_for_prompt: true,
      callback: async ({ credential }: { credential: string }) => {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: credential,
        });
        if (!error) {
          router.push("/dashboard");
          router.refresh();
        }
      },
    });

    const btn = document.getElementById("google-btn");
    if (btn) {
      window.google.accounts.id.renderButton(btn, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        width: 280,
        text: "continue_with",
        logo_alignment: "left",
      });
    }

    // Show One Tap prompt on top of the page
    window.google.accounts.id.prompt();
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleSignIn}
      />
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-primary/10">
                <BarChart2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Glade</CardTitle>
            <CardDescription>
              Sign in to access your trading dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            {/* Google renders its button here */}
            <div id="google-btn" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
