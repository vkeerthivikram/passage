module.exports = {
  expo: {
    name: 'Passage', slug: 'passage', version: '0.1.0', scheme: 'passage',
    orientation: 'portrait', userInterfaceStyle: 'dark',
    android: { package: 'app.passage.reader', permissions: ['CAMERA'], allowBackup: false },
    plugins: [
      'expo-secure-store', 'expo-sqlite',
      ['expo-image-picker', { photosPermission: 'Choose a page to capture.', cameraPermission: 'Photograph a page to capture a passage.', microphonePermission: false }],
      './plugins/withPassage'
    ]
  }
};
