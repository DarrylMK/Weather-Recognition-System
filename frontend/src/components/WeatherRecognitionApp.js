import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sun, Cloud, Cloudy, CloudRain, CloudLightning, Camera, TreePine, TreeDeciduous } from 'lucide-react';

const WeatherPredictionApp = () => {
  const [offsetX, setOffsetX] = useState(0);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const bodyRef = useRef(null);
  const footerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    //Script AOS
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js";
    script.async = true;
    document.head.appendChild(script);

    //CSS AOS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css";
    document.head.appendChild(link);

    // Inisialisasi AOS
    script.onload = () => {
      window.AOS.init({
        duration: 1000,
        once: false,
        easing: 'ease-in-out',
      });
    };

    const handleScroll = () => {
      setOffsetX(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);

    // Cleanup
    return () => {
      document.head.removeChild(script);
      document.head.removeChild(link);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current) {
      const initCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoRef.current.srcObject = stream;
          streamRef.current = stream; // Store stream reference
        } catch (err) {
          if (err.name === 'NotAllowedError') {
            setError('Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser.');
          } else if (err.name === 'NotFoundError') {
            setError('Tidak dapat menemukan kamera. Pastikan perangkat memiliki kamera.');
          } else {
            setError('Gagal mengakses kamera. Silakan coba lagi.');
          }
          setIsCameraOpen(false);
        }
      };

      initCamera();
    }
  }, [isCameraOpen]);

  const weatherIcons = [
    <Sun className="w-8 h-8 text-yellow-500" />,
    <Cloudy className="w-8 h-8 text-gray-500" />,
    <CloudLightning className="w-8 h-8 text-gray-700" />,
    <CloudRain className="w-8 h-8 text-blue-500" />
  ];

  const weatherLabelToIndex = {
    sunny: 0,
    cloudy: 1,
    overcast: 2,
    rain: 3,
};

  // Fungsi untuk mengubah string menjadi kapital per kata
const capitalizeWords = (str) => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setPredictions(null);
      setError(null);
    }
  };

  const startCamera = async () => {
    if (isCameraOpen) {
      // Stop the camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsCameraOpen(false);
    } else {
      setIsCameraOpen(true);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        setImage(blob);
        setPreview(canvas.toDataURL('image/jpeg'));
        setPredictions(null);
        setError(null);
      }, 'image/jpeg');

      // Stop camera stream
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCameraOpen(false);
    }
  };

  const getPredictions = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', image);

      // http://192.168.100.10:5000/api/predict
      // http://localhost:5000/api/predict
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Prediction failed');

      const data = await response.json();
      setPredictions(data);
      console.log(data);
    } catch (err) {
      setError('Failed to get predictions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getHighestProbabilityWeather = () => {
    if (!predictions) return null;
    const { weather } = predictions;
    const maxIndex = Object.keys(weather.probabilities).indexOf(
      Object.keys(weather.probabilities).reduce((a, b) =>
        weather.probabilities[a] > weather.probabilities[b] ? a : b
      )
    );
    const iconIndex = weatherLabelToIndex[Object.keys(weather.probabilities)[maxIndex]];
    const icon = weatherIcons[iconIndex];
    return {
      label: Object.keys(weather.probabilities)[maxIndex][0].toUpperCase() + Object.keys(weather.probabilities)[maxIndex].slice(1),
      probability: weather.probabilities[Object.keys(weather.probabilities)[maxIndex]],
      icon: icon
    };
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="backdrop-blur-sm shadow-md fixed w-full z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold">Weather Recognition</span>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => scrollToSection(bodyRef)} className="text-gray-600 hover:text-gray-900">
                Get Started
              </button>
              <button onClick={() => scrollToSection(footerRef)} className="text-gray-600 hover:text-gray-900">
                About
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header with Weather Animation */}
      <header className="pt-16 bg-gradient-to-b from-blue-400 to-blue-600 text-white relative overflow-hidden">
        <div className="moving-clouds absolute inset-0">
          <Sun size={100} fill='yellow' color="yellow" strokeWidth={3} className='absolute top-20 right-40' style={{ transform: `translateX(${offsetX * 0.5}px)`, }}/>
          <TreePine size={200} color="green" fill='green' className='absolute left-0 bottom-0 -mb-14 -ml-10' style={{ transform: `translateX(${offsetX * -1}px) translateY(${offsetX * .3}px)`, }}/>
          <TreeDeciduous size={200} color="green" fill='green' className='absolute right-0 bottom-0 -mb-14 -mr-10' style={{ transform: `translateX(${offsetX * .3}px) translateY(${offsetX * .3}px)`, }}/>
          <Cloud size={100} color="#e4e4e7" strokeWidth={3} fill='#e4e4e7' className="cloud cloud-1" />
          <Cloud size={60} color="#e4e4e7" strokeWidth={3} fill='#e4e4e7' className="cloud cloud-2" />
          <Cloud size={60} color="#e4e4e7" strokeWidth={3} fill='#e4e4e7' className="cloud cloud-2" style={{left:"-10px"}} />
          <Cloud size={80} color="#e4e4e7" strokeWidth={3} fill='#e4e4e7' className="cloud cloud-3" />
          <Cloud size={150} color="#e4e4e7" strokeWidth={3} fill='#e4e4e7' className="cloud cloud-4" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <h1 className="text-4xl font-bold text-center mb-4" data-aos="fade-left">
            Weather Recognition System
          </h1>
          <p className="text-xl text-center mb-8" data-aos="fade-left" data-aos-delay="400">
            Pengenalan kondisi cuaca Indonesia dengan menggunakan gambar langit
          </p>
          <div className="flex justify-center" data-aos="fade-up" data-aos-delay="800">
            <button
              onClick={() => scrollToSection(bodyRef)}
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors"
            >
              Get Started →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main ref={bodyRef} className="flex-grow bg-gray-50 py-12" data-aos="fade-up" data-aos-delay="1000">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="p-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Upload Sky Image</h2>
                <p className="text-gray-600">Upload an image or take a photo of the sky to get weather predictions</p>
              </div>

              <div className="flex flex-col items-center space-y-6">
                {/* Camera View */}
                {isCameraOpen && (
                  <div className="relative w-full max-w-xl aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <button 
                      onClick={captureImage}
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Capture Photo
                    </button>
                  </div>
                )}

                {/* Image Upload/Preview Area */}
                {!isCameraOpen && (
                  <div className="w-full max-w-xl">
                    <label className="block w-full">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                        {preview ? (
                          <img
                            src={preview}
                            alt="Preview"
                            className="max-h-64 mx-auto object-contain"
                          />
                        ) : (
                          <div className="space-y-4">
                            <Upload className="w-12 h-12 mx-auto text-gray-400" />
                            <p className="text-gray-500">Click or drag image to upload</p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </label>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-4">
                

                    <button
                      onClick={startCamera}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      {isCameraOpen ? "Close" : "Open Camera"}
                    </button>
                  
                  <button
                    onClick={getPredictions}
                    disabled={!image || loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Analyzing...' : 'Get Predictions'}
                  </button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Predictions Display */}
          {predictions && (
            <div className="space-y-8">
              {/* Weather Classification */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-6">Current Weather</h2>
                  {getHighestProbabilityWeather() && (
                    <div className="bg-blue-50 p-8 rounded-lg inline-block min-w-40" data-aos="zoom-out" data-aos-delay="100">
                      <div className="flex flex-col items-center">
                        {getHighestProbabilityWeather().icon}
                        <p className="text-2xl font-semibold mt-4">
                          {getHighestProbabilityWeather().label}
                        </p>
                        <p className="text-gray-600 mt-2">
                          {(getHighestProbabilityWeather().probability * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Measurements */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-center">Environmental Measurements</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center" data-aos="zoom-out" data-aos-delay="100">
                    <p className="text-gray-600 mb-1">Temperature</p>
                    <p className="text-xl font-semibold">{predictions.metrics.temperature.toFixed(0)}°C</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center" data-aos="zoom-out" data-aos-delay="100">
                    <p className="text-gray-600 mb-1">Humidity</p>
                    <p className="text-xl font-semibold">{predictions.metrics.humidity.toFixed()}%</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center" data-aos="zoom-out" data-aos-delay="100">
                    <p className="text-gray-600 mb-1">Wind Speed</p>
                    <p className="text-xl font-semibold">{predictions.metrics.wind_speed.toFixed()} km/h</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center" data-aos="zoom-out" data-aos-delay="100">
                    <p className="text-gray-600 mb-1">UV Index</p>
                    <p className="text-xl font-semibold">{capitalizeWords(predictions.metrics.uv_index.label)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center" data-aos="zoom-out" data-aos-delay="100">
                    <p className="text-gray-600 mb-1">Pressure</p>
                    <p className="text-xl font-semibold">{predictions.metrics.pressure.toFixed()} hPa</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer ref={footerRef} className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">About Weather Recognition</h3>
              <p className="text-gray-300">
                Weather Recognition adalah sistem yang dikembangkan untuk melakukan
                identifikasi kondisi cuaca di Indonesia menggunakan teknologi 
                machine learning dan analisis gambar. Sistem ini dapat membantu 
                dalam perencanaan aktivitas luar ruangan dan memberikan informasi 
                cuaca yang akurat.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">535210011 - Darryl Matthew Kurniawan</h3>
              <p className="text-gray-300">Email: darryl.535210011@stu.untar.ac.id</p>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .moving-clouds {
          animation: move-clouds 60s linear infinite;
        }
        
        .cloud {
          position: absolute;
        }
        
        .cloud-1 {
          top: 20%;
          left: -100px;
          animation: move-cloud-1 30s linear infinite;
        }
        
        .cloud-2 {
          top: 40%;
          left: -40px;
          animation: move-cloud-2 20s linear infinite;
        }
        
        .cloud-3 {
          top: 70%;
          left: -80px;
          animation: move-cloud-3 25s linear infinite;
        }

        .cloud-4 {
          top: 45%;
          left: calc(50vw);
          animation: move-cloud-4 60s linear infinite;
        }
        
        @keyframes move-cloud-1 {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100vw + 100px)); }
        }
        
        @keyframes move-cloud-2 {
          from { transform: translateX(-40px); }
          to { transform: translateX(calc(100vw + 40px)); }
        }
        
        @keyframes move-cloud-3 {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100vw + 80px)); }
        }

        @keyframes move-cloud-4 {
          0% { transform: translateX(0); } 
          49% { opacity: 1; }
          50% { transform: translateX(calc(50vw));  opacity: 0;} 
          51% { transform: translateX(calc(-50vw - 150px)); opacity: 0;}
          52% { opacity: 1; }
          100% { transform: translateX(0); opacity: 1;}
        }
        
        .upload-area {
          width: 100%;
          max-width: 400px;
          height: 250px;
          border: 2px dashed #ccc;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .predict-button {
          padding: 10px 20px;
          background-color: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        
        .predict-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .measurements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        
        .measurement-item {
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 4px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default WeatherPredictionApp;