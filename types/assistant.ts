/** Un message de la conversation avec l'Assistant IA (élève ou IA). */
export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}
