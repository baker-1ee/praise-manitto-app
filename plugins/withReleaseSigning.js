const { withAppBuildGradle } = require("@expo/config-plugins");

const KEYSTORE_PROPERTIES_LOADER = `
def keystorePropertiesFile = rootProject.file("../keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
`;

const DEBUG_SIGNING_CONFIG = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const DEBUG_AND_RELEASE_SIGNING_CONFIG = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`;

// This must match the release buildType block emitted by the Expo/RN android template.
const RELEASE_BUILD_TYPE_DEBUG_SIGNED = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const RELEASE_BUILD_TYPE_RELEASE_SIGNED = `        release {
            signingConfig signingConfigs.release`;

// Injects a release signingConfig that reads from ../keystore.properties (project root,
// outside android/) so `expo prebuild --clean` doesn't wipe out release signing setup.
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("keystorePropertiesFile")) {
      contents = contents.replace(
        /android \{\n    ndkVersion/,
        `${KEYSTORE_PROPERTIES_LOADER}\nandroid {\n    ndkVersion`
      );
      contents = contents.replace(DEBUG_SIGNING_CONFIG, DEBUG_AND_RELEASE_SIGNING_CONFIG);
      contents = contents.replace(RELEASE_BUILD_TYPE_DEBUG_SIGNED, RELEASE_BUILD_TYPE_RELEASE_SIGNED);
    }

    config.modResults.contents = contents;
    return config;
  });
};
