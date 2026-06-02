import NewDemoForm from "@/components/NewDemoForm";

export default function NewDemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New demo</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Point us at your live site and choose how it should look. The price updates as you go.
        </p>
      </div>
      <NewDemoForm />
    </div>
  );
}
