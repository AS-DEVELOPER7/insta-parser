export default function UploadStatCard({ icon: Icon, value = 0, label }) {
  return (
    <div className="bg-slate-50 dark:bg-black border border-gray-200 dark:border-ig-border p-4 rounded-xl text-center shadow-sm">
      {Icon && <Icon className="text-ig-primary mx-auto mb-2" size={24} />}
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 font-sans">{label}</div>
    </div>
  );
}
