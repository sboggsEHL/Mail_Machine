import { DnmRepository } from '../repositories/DnmRepository';

export class DnmService {
  private dnmRepository: DnmRepository;

  constructor(dnmRepository: DnmRepository) {
    this.dnmRepository = dnmRepository;
  }

  /**
   * Given a list of radarIds, returns only those NOT present in the active DNM registry.
   * @param radarIds List of radarIds to filter
   * @returns List of radarIds not in DNM
   */
  async filterOutDnmRadarIds(radarIds: string[]): Promise<string[]> {
    if (!radarIds.length) return [];
    const dnmRadarIds = await this.dnmRepository.findActiveRadarIds(radarIds);
    const dnmSet = new Set(dnmRadarIds);
    return radarIds.filter(id => !dnmSet.has(id));
  }

  /**
   * Given a list of radarIds, returns those that ARE present in the active DNM registry.
   * @param radarIds List of radarIds to check
   * @returns List of radarIds in DNM
   */
  async getDnmRadarIds(radarIds: string[]): Promise<string[]> {
    if (!radarIds.length) return [];
    return this.dnmRepository.findActiveRadarIds(radarIds);
  }
}
