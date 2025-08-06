import { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

import Providers from "@/components/providers/QueryClient";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });


// This adds default SEO tags to all pages in our app.
// You can override them in each page passing params to getSOTags() function.
export const metadata = getSEOTags();

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			
		>
			<body>
			<ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
			<Providers>
				<ClientLayout>{children}</ClientLayout>
				</Providers>
				</ThemeProvider>
			</body>
		</html>
	);
}
