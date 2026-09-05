import * as Application from "expo-application";
import Constants, { ExecutionEnvironment } from "expo-constants";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * The public version of the app (e.g. "1.0.1"), read from native binary
 * or app config if running inside Expo Go / dev environment.
 */
export const APP_VERSION: string =
  (!isExpoGo && Application.nativeApplicationVersion) ||
  Constants.expoConfig?.version ||
  "1.0.1";

/**
 * The native build number / Android versionCode (e.g. "10", "11").
 */
export const BUILD_NUMBER: string =
  (!isExpoGo && Application.nativeBuildVersion) ||
  Constants.expoConfig?.android?.versionCode?.toString() ||
  "";

/**
 * Formatted version string for display (e.g. "v1.0.1 (11)" or "v1.0.1").
 */
export const FULL_VERSION_DISPLAY: string = BUILD_NUMBER
  ? `v${APP_VERSION} (${BUILD_NUMBER})`
  : `v${APP_VERSION}`;
