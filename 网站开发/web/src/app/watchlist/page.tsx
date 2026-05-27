import { Header } from "@/components/layout/header";

export default function WatchlistPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="px-4 md:px-6 py-12 max-w-[1400px] mx-auto text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          自选列表
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">即将推出</p>
      </main>
    </div>
  );
}
