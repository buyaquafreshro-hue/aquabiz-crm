import { supabase } from "../supabaseClient";

export async function upsertCustomerFromBooking(booking) {
  const mobile = String(booking?.mobile || "").trim();
  if (!mobile) return { error: null };

  const payload = {
    name: String(booking?.customer_name || booking?.name || "Customer").trim(),
    mobile,
    alternate_mobile: String(booking?.alternate_mobile || booking?.alternateNo || "").trim(),
    address: String(booking?.address || "").trim(),
    area: String(booking?.area || "").trim(),
  };

  const { data: existing, error: findError } = await supabase
    .from("customers")
    .select("*")
    .eq("mobile", mobile)
    .limit(1)
    .maybeSingle();

  if (findError) return { error: findError };

  if (existing?.id) {
    const updatePayload = {
      name: existing.name || payload.name,
      alternate_mobile: existing.alternate_mobile || payload.alternate_mobile,
      address: existing.address || payload.address,
      area: existing.area || payload.area,
    };
    return supabase.from("customers").update(updatePayload).eq("id", existing.id);
  }

  return supabase.from("customers").insert([payload]);
}
