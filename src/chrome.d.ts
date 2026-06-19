declare const chrome: {
  action: {
    onClicked: {
      addListener(callback: (tab: { id?: number }) => void): void;
    };
  };
  tabs: {
    sendMessage(tabId: number, message: unknown, callback?: () => void): void;
  };
  runtime: {
    lastError?: { message?: string };
    getURL(path: string): string;
    onMessage: {
      addListener(callback: (message: unknown) => void): void;
    };
  };
  storage: {
    sync: {
      get(key: string, callback: (items: Record<string, unknown>) => void): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
    };
    onChanged: {
      addListener(
        callback: (
          changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
          areaName: string
        ) => void
      ): void;
    };
  };
};
