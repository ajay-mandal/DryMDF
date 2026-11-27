export type AiProvider = "ollama" | "lm-studio" | "hosted" | "chatgpt";
export interface AiTarget {
  provider: AiProvider;
  endpoint: string;
}
export interface AiSettings extends AiTarget {
  enabled: boolean;
  model: string;
  hasApiKey: boolean;
  chatGptConnected: boolean;
}
export interface AiSaveSettings extends AiTarget {
  enabled: boolean;
  model: string;
  apiKey?: string | null;
}
export interface AiTestRequest extends AiTarget {
  model: string;
}
export type AiFailure = {
  status:
    | "invalid"
    | "unavailable"
    | "empty"
    | "auth"
    | "timeout"
    | "cancelled"
    | "error";
};
export type AiResult<T> = ({ status: "ok" } & T) | AiFailure;
// Methods on window.drymdfDesktop. Use a unique requestId (e.g. crypto.randomUUID()) per request.
export interface DesktopAiBridge {
  getAiSettings(): Promise<AiResult<{ settings: AiSettings }>>;
  signInChatGpt(requestId: string): Promise<AiResult<{ connected: boolean }>>;
  disconnectChatGpt(): Promise<AiResult<{ connected: boolean }>>;
  saveAiSettings(
    settings: AiSaveSettings,
  ): Promise<AiResult<{ settings: AiSettings }>>;
  listAiModels(
    requestId: string,
    target: AiTarget,
  ): Promise<AiResult<{ models: { id: string; label: string }[] }>>;
  testAiConnection(
    requestId: string,
    target: AiTestRequest,
    onChunk?: (chunk: string) => void,
  ): Promise<AiResult<{ text: string }>>;
  cancelAiRequest(requestId: string): Promise<boolean>;
}
// apiKey omitted retains that endpoint's existing key; null removes it. No key-read API.
