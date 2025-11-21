type AnalyticsPayload = Record<string, unknown>;

export function track(event: string, payload?: AnalyticsPayload) {
  if (__DEV__) {
    console.log(`[analytics] ${event}`, payload ?? {});
  }
}

