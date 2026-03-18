'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  label: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
  freeNavigation?: boolean;
}

export default function WizardStepper({ steps, currentStep, onStepClick, freeNavigation = false }: WizardStepperProps) {
  return (
    <nav className="flex items-center justify-between">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isFuture = stepNum > currentStep;
        const isClickable = freeNavigation ? !isActive : isCompleted;

        return (
          <React.Fragment key={index}>
            {/* Step circle + label */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(stepNum)}
              disabled={!isClickable && !isActive}
              className={`flex flex-col items-center gap-1.5 group ${
                isClickable ? 'cursor-pointer' : isActive ? 'cursor-default' : 'cursor-not-allowed'
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'border-green-500 bg-green-500 text-white group-hover:bg-green-600 group-hover:border-green-600'
                    : isActive
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : freeNavigation
                        ? 'border-secondary-300 bg-white text-secondary-500 group-hover:border-primary-400 group-hover:text-primary-600'
                        : 'border-secondary-300 bg-white text-secondary-400'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isCompleted
                    ? 'text-green-600 group-hover:text-green-700'
                    : isActive
                      ? 'text-primary-700'
                      : freeNavigation
                        ? 'text-secondary-500 group-hover:text-primary-600'
                        : 'text-secondary-400'
                }`}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] ${
                  stepNum < currentStep ? 'bg-green-500' : 'bg-secondary-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
