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
    id: 'FirstAmerican',
    name: 'FirstAmerican',
    description: 'FirstAmerican (DataTree) API integration (stub)'
  }
 
];
