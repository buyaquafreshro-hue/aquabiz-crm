import { supabase } from "../supabaseClient";

export async function saveJobAssignment(bookingId, technicianId) {
  const { data: existing, error: findError } = await supabase
    .from("job_assignments")
    .select("id")
    .eq("booking_id", bookingId)
    .limit(1)
    .maybeSingle();

  if (findError) return { error: findError };

  if (existing?.id) {
    return supabase
      .from("job_assignments")
      .update({ technician_id: technicianId, status: "Assigned" })
      .eq("id", existing.id);
  }

  return supabase
    .from("job_assignments")
    .insert([{ booking_id: bookingId, technician_id: technicianId, status: "Assigned" }]);
}