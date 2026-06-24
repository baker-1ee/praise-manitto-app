// Firebase v12 ships getReactNativePersistence only in the react-native bundle
// but TypeScript resolves to browser types. This augments the types correctly.
export {};

declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: import('@react-native-async-storage/async-storage').AsyncStorageStatic
  ): Persistence;
}
