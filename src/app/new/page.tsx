import NewDemoForm from "@/components/NewDemoForm";

export default function NewDemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New demo</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Paste a link to your live website, or to a public GitHub repo that has one. The price updates as you go.
        </p>
      </div>
      <NewDemoForm />
    </div>
  );
}
