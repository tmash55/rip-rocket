import ADPSmashboard from '@/components/fantasy/ADPSmashBoard'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ADP Smashboard - Fantasy Football Draft Value | OddsMash',
  description: 'Compare average draft positions across ESPN, Yahoo, Sleeper, and NFC. Find value picks and dominate your fantasy football draft.',
  keywords: 'fantasy football, ADP, average draft position, draft tool, ESPN, Yahoo, Sleeper, fantasy football rankings',
}

export default function ADPSmashboardPage() {
  return (
    <>
      {/* Enhanced Hero Section */}
      <div className="bg-gradient-to-br from-card/80 to-muted/40 dark:from-card/60 dark:to-muted/20 border-b-2 border-border/60">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/15 dark:bg-primary/25 rounded-3xl mb-4 border-2 border-primary/20">
              <span className="text-4xl">🏈</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black mb-4 text-foreground tracking-tight">
                ADP Valueboard
              </h1>
              <p className="text-xl md:text-2xl mb-4 text-muted-foreground font-medium">
                Your Fantasy Football Draft Command Center
              </p>
              <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Compare average draft positions across all major platforms. 
                Spot value picks, identify platform discrepancies, and dominate your draft with comprehensive ADP analysis.
              </p>
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Methodology Note */}
        <div className="mb-6 rounded-xl border border-border/60 bg-card/50 p-4 text-sm text-muted-foreground">
          <p>
            These values are based on each platform’s live draftroom rankings — the lists your league mates
            actually see and sort by on draft day. We build a consensus from <strong>Sleeper</strong>,
            <strong> ESPN</strong>, and <strong>Yahoo</strong> rankings, then compare those rankings against
            high-stakes ADP from <strong>NFC</strong> (Rotowire Online) to surface value and reach spots.
          </p>
        </div>
        <ADPSmashboard />
      </div>

      {/* Enhanced Footer Info */}
      <div className="bg-gradient-to-r from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 border-t-2 border-border/60">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Master Your Draft Strategy</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Use comprehensive ADP data from all major platforms to make informed draft decisions
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-card/60 dark:bg-card/40 rounded-2xl border border-border/40">
              <div className="w-16 h-16 bg-blue-500/10 dark:bg-blue-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-lg font-bold mb-3 text-foreground">
                Find Value Picks
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Spot players with significant ranking differences between platforms. 
                Identify sleepers and avoid reaches with cross-platform analysis.
              </p>
            </div>
            <div className="text-center p-6 bg-card/60 dark:bg-card/40 rounded-2xl border border-border/40">
              <div className="w-16 h-16 bg-purple-500/10 dark:bg-purple-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-lg font-bold mb-3 text-foreground">
                Platform Comparison
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Compare rankings across ESPN, Yahoo, Sleeper, and NFC Sharp. 
                See exactly where each platform values every player.
              </p>
            </div>
            <div className="text-center p-6 bg-card/60 dark:bg-card/40 rounded-2xl border border-border/40">
              <div className="w-16 h-16 bg-orange-500/10 dark:bg-orange-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏆</span>
              </div>
              <h3 className="text-lg font-bold mb-3 text-foreground">
                Draft Smarter
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Use consensus rankings, position tiers, and draft round projections 
                to build the perfect draft strategy for your league.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
