import TelephonyPage from "@/pages/telephony-page";

// This is a wrapper that reuses the existing TelephonyPage
// Later this will be refactored to remove KPI cards and focus on configuration only
export default function TelephonySettingsPage() {
  return <TelephonyPage />;
}