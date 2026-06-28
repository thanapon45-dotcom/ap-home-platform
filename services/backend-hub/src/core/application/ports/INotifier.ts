/**
 * TASK-105: INotifier Port
 * Sends alert/info messages to operators (Telegram, LINE, etc.)
 */

export interface NotifierMessage {
  title: string;
  body: string;
  level: "info" | "warn" | "alert";
}

export interface INotifier {
  /** Send a plain text message */
  send(message: string): Promise<void>;
  /** Send a structured message with title and severity level */
  sendStructured(message: NotifierMessage): Promise<void>;
}
