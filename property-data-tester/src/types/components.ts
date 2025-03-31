import { PropertyRadarProperty, PropertyRadarApiParams } from './api';

export interface LoginProps {
  onLoginSuccess: () => void;
}

export interface ApiParamsFormProps {
  apiParams: PropertyRadarApiParams;
  setApiParams: React.Dispatch<React.SetStateAction<PropertyRadarApiParams>>;
}

export interface FieldSelectorProps {
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
