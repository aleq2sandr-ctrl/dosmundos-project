import React from 'react';

const TestComponent = () => {
  console.log('VITE_DEEPSEEK_API_KEY:', import.meta.env.VITE_DEEPSEEK_API_KEY);
  return <div>Test Component</div>;
};

export default TestComponent;
