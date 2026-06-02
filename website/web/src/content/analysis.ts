// website/web/src/content/analysis.ts

export const ANALYSIS_TEXT = {
  title:   "AI Investment Committee",
  start:   "Start Analysis",
  running: "Running Multi-Agent Analysis...",
  modes: {
    standard: "Standard",
    deep:     "Deep Research",
  },
  markets: {
    US: "US Stocks",
    HK: "HK Stocks",
    CN: "A-Shares",
  },
  bootSteps: [
    "Connecting to market data",
    "Fundamental analyst ready",
    "Sentiment engine ready",
    "Debate system online",
    "Portfolio engine ready",
  ],
  errors: {
    tickerRequired: "Please enter a ticker symbol",
    analysisLaunchFailed: "Failed to launch analysis. Please try again.",
  },
};
