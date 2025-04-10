export interface DataProvider {
  id: string;
  name: string;
  description?: string;
}

export const DATA_PROVIDERS: DataProvider[] = [
  {
    id: 'PropertyRadar',
    name: 'PropertyRadar',
    description: 'PropertyRadar API integration'
  },
  {
    id: 'ProviderX',
    name: 'ProviderX',
    description: 'Future provider X integration'
  },
  {
    id: 'ProviderY',
    name: 'ProviderY',
    description: 'Future provider Y integration'
  }
];
