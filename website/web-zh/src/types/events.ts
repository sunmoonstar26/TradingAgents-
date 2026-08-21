import type { TARawResult } from "@/schemas/analysis-result";
import type { StockDetail } from "@/types";

export interface AnalysisCompletedEvent {
  companyId: string;
  analysisResultId: string;
  sessionId: string;
  raw: TARawResult;
  detail: StockDetail;
}
