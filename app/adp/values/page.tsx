import PlatformDraftAssistant from '@/components/fantasy/PlatformDraftAssistant'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform vs Sharp ADP - Fantasy Football Draft Values | OddsMash',
  description: 'Compare platform rankings against high-stakes league consensus (NFC). Find value picks and avoid busts across ESPN, Yahoo, Sleeper, and CBS.',
  keywords: 'fantasy football values, draft steals, platform comparison, NFC rankings, sleepers, busts, ESPN vs NFC, fantasy football analysis',
}

export default function ADPValuesPage() {
  return (
    <>
      {/* Enhanced Hero Section */}
      <div className="bg-gradient-to-br from-card/80 to-muted/40 dark:from-card/60 dark:to-muted/20 border-b-2 border-border/60">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/15 dark:bg-primary/25 rounded-3xl mb-4 border-2 border-primary/20">
              <span className="text-4xl">💎</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black mb-4 text-foreground tracking-tight">
                ADP Values & Busts
              </h1>
              <p className="text-xl md:text-2xl mb-4 text-muted-foreground font-medium">
                Find Hidden Gems and Avoid Draft Traps
              </p>
              <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Discover players with significant ranking differences across platforms. 
                Target undervalued sleepers and steer clear of potential busts using data-driven insights.
              </p>
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <PlatformDraftAssistant />
      </div>

      {/* Enhanced Footer Info */}
      <div className="bg-gradient-to-r from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 border-t-2 border-border/60">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our analysis compares platform rankings against NFC Sharp consensus to identify opportunities
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-card/60 dark:bg-card/40 rounded-2xl border border-border/40">
              <div className="w-16 h-16 bg-green-500/10 dark:bg-green-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💎</span>
              </div>
              <h3 className="text-lg font-bold mb-3 text-foreground">
                Hidden Values
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Players ranked significantly lower on your platform compared to sharp consensus. 
                These are potential steals in later rounds.
              </p>
            </div>
            <div className="text-center p-6 bg-card/60 dark:bg-card/40 rounded-2xl border border-border/40">
              <div className="w-16 h-16 bg-red-500/10 dark:bg-red-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚨</span>
              </div>
              <h3 className="text-lg font-bold mb-3 text-foreground">
                Potential Busts
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Players ranked much higher on your platform vs consensus. 
                Consider avoiding or targeting in later rounds.
              </p>
            </div>
            <div className="text-center p-6 bg-card/60 dark:bg-card/40 rounded-2xl border border-border/40">
              <div className="w-16 h-16 bg-blue-500/10 dark:bg-blue-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-lg font-bold mb-3 text-foreground">
                Smart Analysis
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Data-driven insights using high-stakes league data (NFC) as the baseline 
                for accurate player valuations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
