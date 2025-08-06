import { ReactNode, Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";


import Providers from "@/components/providers/QueryClient";
import Footer from "@/components/Footer";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });


// This adds default SEO tags to all pages in our app.
// You can override them in each page passing params to getSOTags() function.
export const metadata = getSEOTags();

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			
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
