import { supabase } from "../supabaseClient";
import { getRoleSession } from "../utils/roleSession";

/**
 * Log a communication action (call or whatsapp click) to Supabase.
 * This is non-blocking and handles errors gracefully.
 */
export async function logCommunication({
  action_type, // 'call' | 'whatsapp'
  customer_id = null,
  lead_id = null,
  booking_id = null,
  job_assignment_id = null,
  customer_name = null,
  customer_mobile = null,
  source_screen = null,
  notes = null,
}) {
  try {
    const session = getRoleSession();
    const actor_role = session?.role || "admin";
    const actor_id = session?.userId || null;
    const actor_name = session?.name || "Admin";

    const payload = {
      actor_role,
      actor_id: actor_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor_id) ? actor_id : null,
      actor_name,
      action_type,
      customer_id,
      lead_id,
      booking_id,
      job_assignment_id,
      customer_name,
      customer_mobile,
      source_screen,
      notes,
    };

    const { error } = await supabase.from("communication_logs").insert([payload]);
    if (error) {
      console.warn("Communication logging failed:", error.message);
    }
  } catch (err) {
    console.warn("Failed to insert communication log:", err);
  }
}
