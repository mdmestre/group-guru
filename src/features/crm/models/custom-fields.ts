/**
 * CRM Custom Fields Types & Interfaces
 */

export type CustomFieldType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multiselect' 
  | 'date' 
  | 'checkbox' 
  | 'textarea' 
  | 'email' 
  | 'phone' 
  | 'url' 
  | 'currency';

export type EntityType = 'contact' | 'company' | 'deal';

export interface CustomField {
  id: string;
  companyId: string;
  name: string;
  label: string;
  fieldType: CustomFieldType;
  entityType: EntityType;
  description?: string;
  isRequired: boolean;
  isUnique: boolean;
  defaultValue?: string;
  options?: SelectOption[];
  validationRules?: ValidationRule[];
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: string | number;
  message: string;
}

export interface CustomFieldValue {
  id: string;
  contactId: string;
  customFieldId: string;
  companyId: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomFieldInput {
  name: string;
  label: string;
  fieldType: CustomFieldType;
  entityType: EntityType;
  description?: string;
  isRequired?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  options?: SelectOption[];
  validationRules?: ValidationRule[];
}

export interface UpdateCustomFieldInput {
  label?: string;
  description?: string;
  isRequired?: boolean;
  isActive?: boolean;
  options?: SelectOption[];
  validationRules?: ValidationRule[];
}

export interface CustomFieldValueInput {
  customFieldId: string;
  value: string;
}
