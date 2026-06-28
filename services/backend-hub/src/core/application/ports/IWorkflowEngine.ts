export interface IWorkflowEngine {
  trigger(webhookId: string, payload: Record<string, unknown>): Promise<void>;
}
