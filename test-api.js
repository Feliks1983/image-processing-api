const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Test upload
async function testUpload() {
  const form = new FormData();
  form.append('image', fs.createReadStream('car.jpg'));

  const response = await axios.post(`${API_URL}/api/upload/single`, form, {
    headers: form.getHeaders()
  });

  console.log('Upload response:', response.data);
  return response.data.file.filename;
}

// Test image processing
async function testProcess(filename) {
  const response = await axios.post(`${API_URL}/api/process/${filename}`, {
    width: 800,
    height: 600,
    format: 'webp',
    quality: 85,
    sharpen: true
  });

  console.log('Process response:', response.data);
}

// Test responsive images
async function testResponsive() {
  const form = new FormData();
  form.append('image', fs.createReadStream('test-image.jpg'));

  const response = await axios.post(`${API_URL}/api/upload/responsive`, form, {
    headers: form.getHeaders()
  });

  console.log('Responsive response:', response.data);
}

// Run tests
async function runTests() {
  try {
    const filename = await testUpload();
    await testProcess(filename);
    await testResponsive();
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

runTests();