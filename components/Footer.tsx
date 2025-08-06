import Link from "next/link";
import Image from "next/image";
import config from "@/config";
import logo from "@/app/icon.png";

// Modern, responsive footer component with clean design
const Footer = () => {
  return (
    <footer className="bg-gradient-to-t from-muted/30 to-background border-t border-border/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-6">
              <Link
                href="/"
                aria-current="page"
                className="inline-flex items-center gap-3 group transition-all duration-200 hover:scale-105"
              >
                <div className="relative">
                  <Image
                    src={logo || "/placeholder.svg"}
                    alt={`${config.appName} logo`}
                    priority={true}
                    className="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-200 group-hover:rotate-3"
                    width={40}
                    height={40}
                  />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <span className="font-black text-xl sm:text-2xl text-foreground tracking-tight">
                  {config.appName}
                </span>
              </Link>
              
              <div className="space-y-4 max-w-md">
                <p className="text-muted-foreground leading-relaxed">
                  {config.appDescription}
                </p>
                
               
              </div>
            </div>

            {/* Links Section */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Quick Links
              </h3>
              <nav className="flex flex-col space-y-3">
                {config.resend?.supportEmail && (
                  <a
                    href={`mailto:${config.resend.supportEmail}`}
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm hover:translate-x-1 transform transition-transform"
                    aria-label="Contact Support"
                  >
                    Support
                  </a>
                )}
                
                
              </nav>
            </div>

            {/* Legal Section */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Legal
              </h3>
              <nav className="flex flex-col space-y-3">
                <Link 
                  href="/tos" 
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm hover:translate-x-1 transform transition-transform"
                >
                  Terms of Service
                </Link>
                <Link 
                  href="/privacy-policy" 
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm hover:translate-x-1 transform transition-transform"
                >
                  Privacy Policy
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/60 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-semibold text-foreground">{config.appName}</span>
              <span>• All rights reserved</span>
            </div>
            
            {/* Social Links or Additional Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Made with ❤️</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
