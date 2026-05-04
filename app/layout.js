import "./globals.css";
import Provider from "./provider";
import ConvexClientProvider from "./ConvexClientProvider";


export const metadata = {
  title: "Bhavable",
  description: "Create apps and websites by chatting with AI",
  icons: {
    icon: "/bharcel-builder-logo.png",
  },
};

import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import CreditsDisplay from "@/components/custom/CreditsDisplay";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning >
      <body suppressHydrationWarning>
        <ClerkProvider>
          <ConvexClientProvider>
            <Provider>
              {children}
            </Provider>
          </ConvexClientProvider>

        </ClerkProvider>
      </body>
    </html>
  );
}

