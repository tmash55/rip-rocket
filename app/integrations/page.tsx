"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function IntegrationsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [ebayStatus, setEbayStatus] = useState<any>(null);
	const [isCheckingStatus, setIsCheckingStatus] = useState(false);

	// Check for connection status from URL params
	useEffect(() => {
		const connected = searchParams.get('connected');
		const error = searchParams.get('error');
		const detail = searchParams.get('detail');

		if (connected === 'ebay') {
			toast.success('eBay connected successfully!');
			checkEbayStatus(); // Auto-check status after connection
		} else if (error) {
			const errorMsg = detail ? `${error}: ${decodeURIComponent(detail)}` : error;
			toast.error(`eBay connection failed: ${errorMsg}`);
		}
	}, [searchParams]);

	const handleConnectEbay = () => {
		// Kick off OAuth via our API route (server constructs URL + state)
		window.location.href = "/api/integrations/ebay/authorize";
	};

	const checkEbayStatus = async () => {
		setIsCheckingStatus(true);
		try {
			const response = await fetch('/api/integrations/ebay/status');
			const status = await response.json();
			setEbayStatus(status);
			
			if (status.connected) {
				toast.success('eBay tokens found and valid!');
			} else {
				toast.warning('No eBay connection found');
			}
		} catch (error) {
			toast.error('Failed to check eBay status');
			console.error('eBay status check failed:', error);
		} finally {
			setIsCheckingStatus(false);
		}
	};

	return (
		<div className="container mx-auto px-4 py-10">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground">Integrations</h1>
				<p className="text-muted-foreground mt-2">Connect third-party apps to enhance Rip Rocket. eBay sandbox support is available first.</p>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
					<Card className="h-full">
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background">
									{/* Simple placeholder for eBay logo */}
									<span className="text-sm font-bold">eBay</span>
								</span>
								<span>eBay (Sandbox)</span>
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<p className="text-sm text-muted-foreground">Connect your eBay Sandbox account to Rip Rocket. We will securely store tokens to keep your account linked.</p>
							
							{/* Connection Status */}
							{ebayStatus && (
								<div className="p-3 rounded-lg bg-muted">
									<h4 className="font-medium mb-2">Connection Status:</h4>
									<div className="text-sm space-y-1">
										<div>Connected: <span className={ebayStatus.connected ? "text-green-600" : "text-red-600"}>{ebayStatus.connected ? "Yes" : "No"}</span></div>
										{ebayStatus.connected && ebayStatus.token_info && (
											<>
												<div>Expires: {new Date(ebayStatus.token_info.expires_at).toLocaleString()}</div>
												<div>Expired: <span className={ebayStatus.token_info.is_expired ? "text-red-600" : "text-green-600"}>{ebayStatus.token_info.is_expired ? "Yes" : "No"}</span></div>
												<div>Has Refresh Token: {ebayStatus.token_info.has_refresh_token ? "Yes" : "No"}</div>
											</>
										)}
										{ebayStatus.error && (
											<div>Error: <span className="text-red-600">{ebayStatus.error}</span></div>
										)}
									</div>
								</div>
							)}
							
							<div className="flex gap-3 flex-wrap">
								<Button 
									className="bg-plume text-white hover:shadow-primary/25" 
									onClick={handleConnectEbay}
									disabled={ebayStatus?.connected}
								>
									{ebayStatus?.connected ? "✅ Connected" : "Connect eBay"}
								</Button>
								<Button 
									variant="outline" 
									onClick={checkEbayStatus}
									disabled={isCheckingStatus}
								>
									{isCheckingStatus ? "Checking..." : "Check Status"}
								</Button>
								<Button variant="outline" onClick={() => router.refresh()}>
									Refresh Page
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}





