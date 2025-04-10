import { Campaign } from './Campaign';

/**
 * Interface representing campaign statistics, extending the Campaign interface
 */
export interface CampaignStats extends Campaign {
  total_recipients: number;
  mailed_count: number;
  response_count: number;
  response_rate?: number;
}