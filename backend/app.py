from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import cv2
import numpy as np
import json
import os

app = Flask(__name__)
CORS(app)

# Load model and normalization parameters
# model = tf.keras.models.load_model('best_weather_recognition_model.h5')
model = tf.keras.models.load_model('model_checkpoint_700.h5')

with open('normalization_params.json', 'r') as f:
    norm_params = json.load(f)

numeric_mean = np.array(norm_params['mean'])
numeric_std = np.array(norm_params['std'])
weather_mapping = norm_params['weather_mapping']
uv_mapping = norm_params['uv_mapping']

# Create inverse mappings
weather_inverse_mapping = {v: k for k, v in weather_mapping.items()}
uv_inverse_mapping = {v: k for k, v in uv_mapping.items()}

def preprocess_image(image_bytes):
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Resize and preprocess
    img = cv2.resize(img, (224, 224))
    img = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
    
    # Add batch dimension
    img = np.expand_dims(img, axis=0)
    
    return img

def denormalize_predictions(numeric_pred):
    # Denormalize the numeric predictions
    return numeric_pred * numeric_std + numeric_mean

@app.route('/api/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    try:
        image_file = request.files['image']
        image_bytes = image_file.read()
        processed_image = preprocess_image(image_bytes)
        
        # Get predictions
        weather_pred, numeric_pred = model.predict(processed_image)
        
        # Get the predicted weather class and probabilities
        weather_class = np.argmax(weather_pred[0])
        weather_label = weather_inverse_mapping[weather_class]
        weather_probabilities = {
            weather_inverse_mapping[i]: float(prob) 
            for i, prob in enumerate(weather_pred[0])
        }
        
        # Denormalize numeric predictions
        denorm_numeric = denormalize_predictions(numeric_pred[0])
        temperature, humidity, wind_speed, uv_index_raw, pressure = denorm_numeric
        
        # Round UV index to nearest integer and get label
        uv_index_int = int(round(uv_index_raw))
        uv_index_int = max(0, min(uv_index_int, max(uv_mapping.values())))  # Clamp to valid range
        uv_label = uv_inverse_mapping[uv_index_int]
        
        return jsonify({
            'weather': {
                'predicted_class': weather_label,
                'probabilities': weather_probabilities
            },
            'metrics': {
                'temperature': float(temperature),
                'humidity': float(humidity),
                'wind_speed': float(wind_speed),
                'uv_index': {
                    'value': uv_index_int,
                    'label': uv_label
                },
                'pressure': float(pressure)
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)