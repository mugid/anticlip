declare const chrome: {
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
