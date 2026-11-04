import { reloadAppAsync } from 'expo';
import React, { useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsShape = {
  getGlobalHandler: () => GlobalErrorHandler;
  setGlobalHandler: (handler: GlobalErrorHandler) => void;
};

function readErrorUtils(): ErrorUtilsShape | null {
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!utils?.getGlobalHandler || !utils.setGlobalHandler) return null;
  return utils;
}

/** Preview EAS builds are release binaries, so __DEV__ is false there. */
export function shouldShowStartupErrors(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_SHOW_STARTUP_ERRORS === '1';
}

let current: Error | null = null;
const listeners = new Set<() => void>();
let installed = false;

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getStartupError(): Error | null {
  return current;
}

export function reportStartupError(error: unknown): void {
  if (!shouldShowStartupErrors()) return;
  current = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown startup error');
  emit();
}

export function clearStartupError(): void {
  current = null;
  emit();
}

export function subscribeStartupError(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function installStartupErrorHandler(): void {
  if (installed) return;
  installed = true;
  const utils = readErrorUtils();
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    if (shouldShowStartupErrors() && isFatal) {
      reportStartupError(error);
      // Keep the dev redbox. In a preview release build, the default fatal
      // handler tears the view down before this message can paint.
      if (__DEV__) previous(error, isFatal);
      return;
    }
    previous(error, isFatal);
  });
}

export function useStartupError(): Error | null {
  return useSyncExternalStore(subscribeStartupError, getStartupError, getStartupError);
}

export function StartupErrorScreen({
  error,
  resetError,
}: {
  error: Error;
  resetError?: () => void;
}) {
  const showDetail = shouldShowStartupErrors();
  const detail = `${error.name}: ${error.message}${error.stack ? `\n\n${error.stack}` : ''}`;

  const reload = () => {
    void reloadAppAsync().catch(() => {
      clearStartupError();
      resetError?.();
    });
  };

  const continueAnyway = () => {
    clearStartupError();
    resetError?.();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.hint}>
        {showDetail
          ? 'Startup error in this dev or preview build.'
          : 'Please reload the app to continue.'}
      </Text>
      {showDetail ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text selectable style={styles.mono}>
            {detail}
          </Text>
        </ScrollView>
      ) : null}
      <Pressable accessibilityRole="button" onPress={reload} style={styles.button}>
        <Text style={styles.buttonText}>Reload</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={continueAnyway} style={styles.secondary}>
        <Text style={styles.secondaryText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a0535',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  hint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  scroll: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#12081c',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
  },
  mono: {
    color: '#f5e9ff',
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#a855f7',
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    marginTop: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#ffffff',
    fontSize: 16,
  },
});
