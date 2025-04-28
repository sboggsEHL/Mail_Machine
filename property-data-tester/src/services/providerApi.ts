export interface ProviderApi {
  fetchProperties(params: any): Promise<any>;
  insertProperties(data: any): Promise<any>;
  createCampaign(data: any): Promise<any>;
  createBatchJob?(data: any): Promise<any>;
  processPropertyFiles?(params: { limit: number; cleanup: boolean }): Promise<any>;
  getCurrentUser?(): Promise<any>;
  addToDnm?(data: any): Promise<any>;

  // Criteria-related methods
  fetchAllCriteria?(): Promise<any>;
}
