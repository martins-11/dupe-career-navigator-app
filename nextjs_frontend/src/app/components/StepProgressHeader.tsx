import React from 'react';

type Step = 1 | 2 | 3;

type StepProgressHeaderProps = {
  currentStep: Step;
};

// PUBLIC_INTERFACE
export default function StepProgressHeader({ currentStep }: StepProgressHeaderProps) {
  /** Renders the 3-step progress header shared across ingestion/draft/finalized pages. */
  const isStepActiveOrComplete = (step: Step) => currentStep >= step;
  const isConnectorActive = (fromStep: Step) => currentStep > fromStep;

  const circleStyle = (step: Step): React.CSSProperties => {
    const active = isStepActiveOrComplete(step);
    return {
      backgroundColor: active ? 'var(--primary)' : 'transparent',
      border: active ? 'none' : '2px solid #D1D5DB',
      color: active ? 'white' : '#D1D5DB',
      fontSize: '16px',
      fontWeight: 600,
    };
  };

  const labelStyle = (step: Step): React.CSSProperties => {
    const active = isStepActiveOrComplete(step);
    return {
      fontSize: '14px',
      fontWeight: 500,
      color: active ? '#1F2937' : '#6B7280',
    };
  };

  return (
    <div className="bg-white" style={{ padding: '24px 32px', borderBottom: '1px solid #D1D5DB' }}>
      <div className="flex items-center justify-center gap-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300" style={circleStyle(1)}>
            1
          </div>
          <span style={labelStyle(1)}>Ingestion Hub</span>
        </div>

        <div
          className="h-0.5 w-12 transition-colors duration-300"
          style={{ backgroundColor: isConnectorActive(1) ? 'var(--primary)' : '#D1D5DB' }}
        />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300" style={circleStyle(2)}>
            2
          </div>
          <span style={labelStyle(2)}>Persona Validation</span>
        </div>

        <div
          className="h-0.5 w-12 transition-colors duration-300"
          style={{ backgroundColor: isConnectorActive(2) ? 'var(--primary)' : '#D1D5DB' }}
        />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300" style={circleStyle(3)}>
            3
          </div>
          <span style={labelStyle(3)}>Finalized Persona</span>
        </div>
      </div>
    </div>
  );
}
