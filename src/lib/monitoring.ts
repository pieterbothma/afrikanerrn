import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initMonitoring() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN nie gestel nie. Foutmonitering sal nie aktief wees nie.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enableInExpoDevelopment: false,
    debug: __DEV__,
    tracesSampleRate: 1.0,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
  console.error('Fout opgeteken:', error, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
  console.log(`[${level.toUpperCase()}]`, message);
}

