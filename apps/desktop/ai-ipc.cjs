const maxActiveRequests = 8;

function registerAiIpc(handleEditorRequest, service) {
  const owners = new Map();

  function run(operation) {
    return async (sender, id, target) => {
      if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
        return { status: "invalid" };
      }
      let owner = owners.get(sender);
      if (!owner) {
        const requests = new Map();
        const abort = () => {
          for (const controller of requests.values()) controller.abort();
        };
        const onNavigation = ({ isMainFrame, isSameDocument }) => {
          if (isMainFrame && !isSameDocument) abort();
        };
        const dispose = () => {
          sender.removeListener("did-start-navigation", onNavigation);
          sender.removeListener("render-process-gone", abort);
          sender.removeListener("destroyed", abort);
          owners.delete(sender);
        };
        owner = { requests, abort, dispose };
        owners.set(sender, owner);
        sender.on("did-start-navigation", onNavigation);
        sender.on("render-process-gone", abort);
        sender.on("destroyed", abort);
      }
      const { requests, dispose } = owner;
      if (requests.has(id) || requests.size >= maxActiveRequests) {
        return { status: "invalid" };
      }
      const controller = new AbortController();
      const { signal } = controller;
      const frame = sender.mainFrame;
      requests.set(id, controller);
      try {
        const result = await operation(target, {
          signal,
          onChunk: (chunk) => {
            if (signal.aborted || sender.isDestroyed()) return;
            try {
              if (!frame.detached && sender.mainFrame === frame) {
                frame.send("drymdf:ai-chunk", id, chunk);
              }
            } catch {
              // The frame can disappear before delivery.
              controller.abort();
            }
          },
        });
        return signal.aborted ? { status: "cancelled" } : result;
      } catch {
        return { status: signal.aborted ? "cancelled" : "error" };
      } finally {
        requests.delete(id);
        if (requests.size === 0) dispose();
      }
    };
  }

  function settingsHandler(operation) {
    return async (_sender, ...args) => {
      try {
        return await operation(...args);
      } catch {
        return { status: "error" };
      }
    };
  }

  handleEditorRequest(
    "drymdf:ai-get-settings",
    settingsHandler(service.getSettings),
  );
  handleEditorRequest(
    "drymdf:ai-save-settings",
    settingsHandler(service.saveSettings),
  );
  handleEditorRequest("drymdf:ai-list-models", run(service.listModels));
  handleEditorRequest("drymdf:ai-test-connection", run(service.testConnection));
  handleEditorRequest("drymdf:ai-cancel-request", (sender, id) => {
    const controller = owners.get(sender)?.requests.get(id);
    if (!controller || controller.signal.aborted) return false;
    controller.abort();
    return true;
  });

  return () => {
    for (const { abort } of owners.values()) abort();
  };
}

module.exports = { registerAiIpc };
