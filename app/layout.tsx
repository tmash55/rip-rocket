import { ReactNode, Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import OddSmashPromo from "@/components/OddSmashPromo";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from "@/components/ui/sonner"

import Providers from "./providers"
import Footer from "@/components/Footer";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });


// This adds default SEO tags to all pages in our app.
// You can override them in each page passing params to getSOTags() function.
export const metadata = getSEOTags();

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={font.className}
		>
			<body className="flex min-h-screen flex-col">
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					<Providers>
						<ClientLayout>
							<main className="flex-1">
								<Suspense fallback={<div className="min-h-screen flex items-center justify-center">
									<div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
								</div>}>
                                        {children}
									<Toaster/>
									<Analytics />
								</Suspense>
							</main>
							<Footer />
						</ClientLayout>
					</Providers>
				</ThemeProvider>
			</body>
		</html>
	);
}
