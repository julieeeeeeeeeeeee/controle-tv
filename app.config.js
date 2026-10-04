// Acrescenta ao app.json: a versão (vinda da tag do GitHub) e a assinatura do APK.
module.exports = ({ config }) => ({
  ...config,
  version: process.env.APP_VERSION || config.version,
  android: { ...config.android, versionCode: Number(process.env.VERSION_CODE || 1) },
  plugins: [...(config.plugins || []), './plugins/withSigning'],
});
