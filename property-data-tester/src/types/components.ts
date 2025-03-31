import { PropertyRadarProperty } from './api';

export interface LoginProps {
  onLoginSuccess: () => void;
}

export interface ApiParamsFormProps {
  onFetchProperties: (properties: PropertyRadarProperty[]) => void;
  onLoading: (isLoading: boolean) => void;
}

export interface FieldSelectorProps {
  availableFields: string[];
  selectedFields: string[];
  onFieldSelectionChange: (fields: string[]) => void;
}

export interface PropertyListProps {
  properties: PropertyRadarProperty[];
  selectedFields: string[];
}

export interface InsertResultsProps {
  results: {
    success: boolean;
    error?: string;
    count: number;
    properties: Array<{
      propertyId: number | string;
      radarId: string;
      address: string;
      city: string;
      state: string;
    }>;
  } | null;
}
