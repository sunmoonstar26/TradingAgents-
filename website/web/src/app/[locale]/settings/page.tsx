import { getTranslations } from "next-intl/server";
import { Header } from "../../../components/layout/header";

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <div className="min-h-screen">
      <Header />
      <main className="px-4 md:px-6 py-12 max-w-[1400px] mx-auto text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {t("pageTitle")}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{t("comingSoon")}</p>
      </main>
    </div>
  );
}
