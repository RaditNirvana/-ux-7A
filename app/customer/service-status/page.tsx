import CustomerEmptyState from "@/components/customer/CustomerEmptyState";

export default function CustomerServiceStatusPage() {
  return (
    <CustomerEmptyState
      message="Informasi status servis kendaraan Anda akan muncul di sini setelah pendaftaran servis tersedia."
      title="Status servis"
    />
  );
}
