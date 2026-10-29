const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withPassage(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application[0];
    // Never allow HTTP credentials or personal text in release builds.
    application.$['android:usesCleartextTraffic'] = 'false';
    application.$['android:allowBackup'] = 'false';
    const activity = application.activity.find((entry) => entry.$['android:name'] === '.MainActivity');
    if (!activity) throw new Error('Passage MainActivity missing');
    activity.$['android:launchMode'] = 'singleTask';
    activity['intent-filter'] ||= [];
    for (const mime of ['text/plain', 'image/*']) {
      if (!activity['intent-filter'].some((filter) => filter.data?.some((data) => data.$['android:mimeType'] === mime))) {
        activity['intent-filter'].push({
          action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [{ $: { 'android:mimeType': mime } }]
        });
      }
    }
    return mod;
  });
};
