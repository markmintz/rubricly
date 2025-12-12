// components/MainContent.jsx
import React from 'react';
import FileUpload from './FileUpload';
import DataPreview from './DataPreview';

function MainContent({ 
  file, 
  onFileSelect, 
  onProcess, 
  onClear, 
  loading, 
  error, 
  progress, 
  parsedData, 
  onDataUpdate 
}) {
  return (
    <div className="relative z-10 w-full flex justify-center">
      <div className="w-full md:w-[calc(33.333%+150px)] px-4 sm:px-6 lg:px-8">
        {/* Logo and Subtitle */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img
              src="/rubricly-logo.png"
              alt="Rubricly logo"
              className="h-24 w-auto sm:h-24 md:h-24"
              style={{ transform: 'scale(1.5)' }}
            />
          </div>
          <p className="text-xl text-secondary">
            Upload a PRB PDF to extract all scores and comments from one or many rubrics
          </p>
        </div>

        <div className="space-y-6">
          <FileUpload
            file={file}
            onFileSelect={onFileSelect}
            onProcess={onProcess}
            onClear={onClear}
            loading={loading}
            error={error}
            progress={progress}
          />

          {parsedData && (
            <DataPreview 
              data={parsedData} 
              onDataUpdate={onDataUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default MainContent;