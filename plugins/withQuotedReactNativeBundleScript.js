const { withPodfile, withXcodeProject } = require('expo/config-plugins');

const PHASE_NAME = 'Bundle React Native code and images';
const SCRIPT_MARKER = 'react-native-xcode.sh';
const SAFE_SCRIPT = String.raw`RN_XCODE_SCRIPT=\"$(\"$NODE_BINARY\" --print \"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\")\"\n\"$RN_XCODE_SCRIPT\"`;
const PODS_PHASE_PATCH = `
    installer.pods_project.targets.each do |target|
      target.shell_script_build_phases.each do |phase|
        case phase.name
        when '[CP-User] Generate app.config for prebuilt Constants.manifest'
          phase.shell_script = 'bash "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"'
        when '[CP-User] Generate updates resources for expo-updates'
          phase.shell_script = 'bash "$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh"'
        end
      end
    end`;

module.exports = function withQuotedReactNativeBundleScript(config) {
  config = withXcodeProject(config, (config) => {
    const phases = config.modResults.hash.project.objects.PBXShellScriptBuildPhase || {};
    let changed = false;

    for (const phase of Object.values(phases)) {
      if (!phase || typeof phase !== 'object') continue;
      if (String(phase.name || '').replaceAll('"', '') !== PHASE_NAME) continue;

      const script = String(phase.shellScript || '');
      if (script.includes('RN_XCODE_SCRIPT')) {
        changed = true;
        continue;
      }
      const markerIndex = script.indexOf(SCRIPT_MARKER);
      if (markerIndex < 0) continue;

      const start = script.lastIndexOf('`', markerIndex);
      const end = script.indexOf('`', markerIndex);
      if (start < 0 || end < 0) continue;

      phase.shellScript = script.slice(0, start) + SAFE_SCRIPT + script.slice(end + 1);
      changed = true;
    }

    if (!changed) {
      throw new Error('Could not find the React Native bundle build phase to quote its script path.');
    }
    return config;
  });

  return withPodfile(config, (config) => {
    const marker = 'installer.pods_project.targets.each do |target|';
    if (config.modResults.contents.includes(marker)) return config;

    const installCall = /    react_native_post_install\([\s\S]*?\n    \)/;
    if (!installCall.test(config.modResults.contents)) {
      throw new Error('Could not find react_native_post_install in Podfile.');
    }
    config.modResults.contents = config.modResults.contents.replace(
      installCall,
      (match) => `${match}\n${PODS_PHASE_PATCH}`,
    );
    return config;
  });
};
