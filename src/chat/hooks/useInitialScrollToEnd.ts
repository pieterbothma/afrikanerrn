import { useEffect, useRef } from 'react';

import { useChatContext } from '../ChatContext';

export function useInitialScrollToEnd(hasMessages: boolean) {
  const { scrollToEnd, hasScrolledToEnd } = useChatContext();
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!hasMessages || hasRequested.current) {
      return;
    }
    hasRequested.current = true;
    requestAnimationFrame(() => {
      scrollToEnd({ animated: false });
      requestAnimationFrame(() => {
        scrollToEnd({ animated: false });
      });
    });
    hasScrolledToEnd.value = true;
  }, [hasMessages, scrollToEnd, hasScrolledToEnd]);
}

