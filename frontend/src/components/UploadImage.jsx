import React, { useState, useRef, useEffect } from 'react';

export default function EnhancedUploadImage() {
  // Set page title
  useEffect(() => {
    document.title = "Image Metadata Tool";
  }, []);

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [hashIvPairs, setHashIvPairs] = useState([{ storedHash: '', iv: '' }]);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('embed'); // 'embed' or 'extract'
  const fileInputRef = useRef(null);
  const [downloadStatus, setDownloadStatus] = useState('');

  // For mobile responsiveness
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePairChange = (index, field, value) => {
    const updatedPairs = [...hashIvPairs];
    updatedPairs[index][field] = value;
    setHashIvPairs(updatedPairs);
  };

  const addHashIvPair = () => {
    setHashIvPairs([...hashIvPairs, { storedHash: '', iv: '' }]);
  };

  const removePair = (index) => {
    if (hashIvPairs.length > 1) {
      const updatedPairs = hashIvPairs.filter((_, i) => i !== index);
      setHashIvPairs(updatedPairs);
    }
  };

  // Function to automatically download image
  const autoDownloadImage = (imageUrl) => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'image_with_metadata.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadStatus('Image downloaded successfully!');

      // Clear status after 3 seconds
      setTimeout(() => {
        setDownloadStatus('');
      }, 3000);
    } catch (err) {
      console.error('Download error:', err);
      setError(`Error downloading image: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      setError('Please select an image.');
      return;
    }

    if (activeTab === 'embed' && hashIvPairs.some(pair => pair.storedHash.trim() === '' || pair.iv.trim() === '')) {
      setError('Please fill in all hash and IV fields.');
      return;
    }

    setIsLoading(true);
    setError('');
    setExtractedData(null);
    setDownloadStatus('');

    const formData = new FormData();
    formData.append('image', image);

    try {
      let result;

      if (activeTab === 'embed') {
        const validPairs = hashIvPairs.filter(pair => 
          pair.storedHash.trim() !== '' && pair.iv.trim() !== ''
        );
        const metadataJson = JSON.stringify(validPairs);
        formData.append('metadataJson', metadataJson);

        result = await fetch('https://cryptohasher.onrender.com/embed', {
          method: 'POST',
          body: formData,
        });
      } else {
        result = await fetch('https://cryptohasher.onrender.com/extract', {
          method: 'POST',
          body: formData,
        });
      }

      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(`Server responded with ${result.status}: ${errorText}`);
      }

      // Check the Content-Type of the response
      const contentType = result.headers.get('Content-Type');

      if (activeTab === 'embed') {
        if (contentType.includes('application/json')) {
          // Handle JSON response
          const data = await result.json();
          if (data.imageUrl) {
            autoDownloadImage(data.imageUrl);
          } else if (data.image) {
            autoDownloadImage(`data:image/png;base64,${data.image}`);
          } else {
            setError('No image data found in response.');
          }
        } else if (contentType.includes('image/')) {
          // Handle binary image response
          const blob = await result.blob();
          const imageUrl = URL.createObjectURL(blob);
          autoDownloadImage(imageUrl);
          // Clean up the object URL after download
          setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
        } else {
          throw new Error(`Unexpected Content-Type: ${contentType}`);
        }
      } else {
        // Extract tab - expect JSON
        if (!contentType.includes('application/json')) {
          throw new Error(`Expected JSON response, got Content-Type: ${contentType}`);
        }
        const data = await result.json();
        if (data.extractedData) {
          setExtractedData(data.extractedData);
        } else {
          setExtractedData(data);
        }
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error('Request error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setImagePreview(null);
    setHashIvPairs([{ storedHash: '', iv: '' }]);
    setExtractedData(null);
    setError('');
    setDownloadStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg rounded-lg overflow-hidden border border-indigo-100">
        <div className="flex border-b border-indigo-200">
          <button
            className={`px-4 py-3 text-sm flex-1 font-medium transition ${
              activeTab === 'embed' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'
            }`}
            onClick={() => setActiveTab('embed')}
          >
            Embed Metadata
          </button>
          <button
            className={`px-4 py-3 text-sm flex-1 font-medium transition ${
              activeTab === 'extract' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'
            }`}
            onClick={() => setActiveTab('extract')}
          >
            Extract Metadata
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-4">
            <div className={`${isMobile ? 'block' : 'flex'} gap-4`}>
              {/* Image Upload Section */}
              <div className={`${isMobile ? 'w-full mb-4' : 'w-1/2'}`}>
                <div className="bg-white border-2 border-dashed border-indigo-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition"
                  onClick={() => fileInputRef.current?.click()}>
                  {imagePreview ? (
                    <div className="relative w-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain" />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetForm();
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className="w-16 h-16 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <p className="mt-2 text-sm text-indigo-600 font-medium">Click to upload an image</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Metadata Section - Only show when 'embed' tab is active */}
              {activeTab === 'embed' && (
                <div className={`${isMobile ? 'w-full' : 'w-1/2'}`}>
                  <div className="bg-white border border-indigo-200 rounded-lg p-4 h-full shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-indigo-800">Hash & IV Pairs</h3>
                      <button
                        type="button"
                        onClick={addHashIvPair}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-sm transition"
                      >
                        + Add Hash & IV Pair
                      </button>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {hashIvPairs.map((pair, index) => (
                        <div key={index} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-indigo-700">Pair #{index + 1}</span>
                            {hashIvPairs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePair(index)}
                                className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-md shadow-sm transition text-xs"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex space-x-2 items-center">
                              <label className="text-xs w-20 text-gray-700">datah1:</label>
                              <input
                                type="text"
                                value={pair.storedHash}
                                onChange={(e) => handlePairChange(index, 'storedHash', e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                              />
                            </div>
                            <div className="flex space-x-2 items-center">
                              <label className="text-xs w-20 text-gray-700">datai2:</label>
                              <input
                                type="text"
                                value={pair.iv}
                                onChange={(e) => handlePairChange(index, 'iv', e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !image}
                className={`px-8 py-3 rounded-lg font-medium shadow-md transition ${
                  isLoading || !image
                    ? 'bg-gray-400 cursor-not-allowed'
                    : activeTab === 'embed'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                } text-white`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : activeTab === 'embed' ? 'Embed Metadata' : 'Extract Metadata'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}

          {downloadStatus && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 shadow-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <p>{downloadStatus}</p>
              </div>
            </div>
          )}

          {/* Display extracted data when in extract mode */}
          {activeTab === 'extract' && extractedData && (
            <div className="mt-6 bg-white p-5 rounded-lg border border-indigo-200 shadow-sm">
              <h3 className="text-lg font-medium text-indigo-800 mb-4">Extracted Metadata</h3>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.isArray(extractedData) ? (
                  extractedData.map((pair, index) => (
                    <div key={index} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="flex items-center mb-2">
                        <span className="text-xs font-medium text-indigo-700">Pair #{index + 1}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex space-x-2 items-center">
                          <label className="text-xs w-20 text-gray-700">storedHash:</label>
                          <div className="flex-1 p-2 bg-white border border-gray-300 rounded-md text-xs break-all">
                            {pair.storedHash}
                          </div>
                        </div>
                        <div className="flex space-x-2 items-center">
                          <label className="text-xs w-20 text-gray-700">iv:</label>
                          <div className="flex-1 p-2 bg-white border border-gray-300 rounded-md text-xs break-all">
                            {pair.iv}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg text-yellow-700">
                    No valid metadata pairs found in the image.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}