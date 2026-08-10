import { Schema, model, models, Document } from "mongoose";

// Operational telemetry from the agent: crashes, clock jumps, quota evictions,
// degraded-mode transitions. Used to prove the zero-loss guarantee in the field and
// to alert when a device stops reporting.
export interface IAgentEvent extends Document {
  id: string;
  deviceId: string;
  userId: string;
  type: string;
  atUtc: Date;
  data?: Record<string, unknown>;
  receivedAt: Date;
}

const agentEventSchema = new Schema<IAgentEvent>(
  {
    deviceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    atUtc: { type: Date, required: true },
    data: { type: Schema.Types.Mixed },
    receivedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  }
);

agentEventSchema.index({ deviceId: 1, atUtc: 1 });

const AgentEventModel =
  models.AgentEvent || model<IAgentEvent>("AgentEvent", agentEventSchema);

export { AgentEventModel };
