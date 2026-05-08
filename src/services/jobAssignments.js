import { supabase } from "../supabaseClient";

export async function saveJobAssignment(bookingId, technicianId) {
  const { data: existing, error: findError } = await supabase
    .from("job_assignments")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (findError) return { error: findError };

  if (existing?.id) {
    const result = await supabase
      .from("job_assignments")
      .update({ technician_id: technicianId, status: "Assigned", assignment_status: "assigned", is_active: true })
      .eq("id", existing.id);
    if (result.error) return result;
    return updateBookingAssignment(bookingId, technicianId);
  }

  const result = await supabase
    .from("job_assignments")
    .insert([{
      booking_id: bookingId,
      technician_id: technicianId,
      status: "Assigned",
      job_status: "assigned",
      assignment_status: "assigned",
      is_active: true,
    }]);
  if (result.error) return result;
  return updateBookingAssignment(bookingId, technicianId);
}

export async function reassignTechnician({ bookingId, job, newTechnicianId }) {
  if (!bookingId || !job?.id || !newTechnicianId) {
    return { error: { message: "Booking, current job, and new technician are required." } };
  }

  const status = String(job.status || job.job_status || "").trim().toLowerCase();
  if (["completed", "complete", "closed", "done", "cancelled", "canceled"].includes(status)) {
    return { error: { message: "Completed or cancelled jobs cannot be reassigned." } };
  }

  if (String(job.technician_id || "") === String(newTechnicianId)) {
    return { error: { message: "Please select a different technician." } };
  }

  const rpcResult = await supabase.rpc("reassign_technician", {
    p_booking_id: bookingId,
    p_old_technician_id: job.technician_id,
    p_new_technician_id: newTechnicianId,
  });

  if (!rpcResult.error) return { error: null };

  const { error: oldError } = await supabase
    .from("job_assignments")
    .update({
      is_active: false,
      assignment_status: "reassigned",
      reassigned_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (oldError) return { error: oldError };

  const { error: insertError } = await supabase
    .from("job_assignments")
    .insert([{
      booking_id: bookingId,
      technician_id: newTechnicianId,
      reassigned_from: job.id,
      is_active: true,
      assignment_status: "assigned",
      status: "Assigned",
      job_status: "assigned",
    }]);

  if (insertError) return { error: insertError };
  return updateBookingAssignment(bookingId, newTechnicianId);
}

export async function updateBookingAssignment(bookingId, technicianId) {
  return supabase
    .from("bookings")
    .update({
      assigned_technician_id: technicianId,
      booking_status: "assigned",
    })
    .eq("id", bookingId);
}

export async function completeJobWithInvoice({ bookingId, jobId, invoiceId }) {
  if (!bookingId || !jobId || !invoiceId) {
    return { error: { message: "Invoice is required before closing the job." } };
  }

  const rpcResult = await supabase.rpc("complete_job_with_invoice", {
    p_booking_id: bookingId,
    p_job_assignment_id: jobId,
    p_invoice_id: invoiceId,
  });

  if (!rpcResult.error) return { error: null };

  const completedAt = new Date().toISOString();
  const { error: jobError } = await supabase
    .from("job_assignments")
    .update({
      status: "Completed",
      job_status: "completed",
      assignment_status: "completed",
      completed_at: completedAt,
    })
    .eq("id", jobId);

  if (jobError) return { error: jobError };

  return supabase
    .from("bookings")
    .update({
      booking_status: "completed",
      completed_at: completedAt,
    })
    .eq("id", bookingId);
}
