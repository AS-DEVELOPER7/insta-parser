export default function UploadStatCard({ icon: Icon, value = 0, label }) {
  return (
    <div className="bg-black border border-ig-border p-4 rounded-xl text-center">
      {Icon && <Icon className="text-ig-primary mx-auto mb-2" size={24} />}
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 font-sans">{label}</div>
    </div>
  );
}
