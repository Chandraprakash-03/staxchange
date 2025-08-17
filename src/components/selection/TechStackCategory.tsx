'use client';

import React from 'react';

export interface TechOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  popular?: boolean;
  compatibility?: string[];
  incompatible?: string[];
}

interface TechStackCategoryProps {
  title: string;
  description: string;
  options: TechOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function TechStackCategory({
  title,
  description,
  options,
  selectedValue,
  onSelect,
  disabled = false,
  required = false
}: TechStackCategoryProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            className={`
              relative p-4 border rounded-lg text-left transition-all duration-200
              ${disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:border-blue-300 hover:shadow-sm cursor-pointer'
              }
              ${selectedValue === option.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 bg-white'
              }
            `}
          >
            {option.popular && (
              <div className="absolute -top-2 -right-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Popular
                </span>
              </div>
            )}
            
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{option.icon}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {option.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {option.description}
                </p>
              </div>
            </div>

            {selectedValue === option.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}