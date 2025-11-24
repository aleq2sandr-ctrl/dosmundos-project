import React from 'react';

const GenericPage = ({ title }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">{title}</h1>
      <div className="prose prose-invert max-w-none">
        <p>Страница "{title}" находится в разработке.</p>
      </div>
    </div>
  );
};

export default GenericPage;
