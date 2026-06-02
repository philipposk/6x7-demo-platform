import Link from "next/link";
import SubscribeButtons from "@/components/SubscribeButtons";

export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Subscribe</h1>
        <p className="mt-3 text-zinc-400">
          Unlimited hosted demo videos and screenshot grids. Premium voices included.
        </p>
      </div>

      <div className="mt-8">
        <SubscribeButtons />
      </div>

      <p className="mt-8 text-center text-sm text-zinc-500">
        Or run everything free with the{" "}
        <a href="https://github.com/philipposk/demo-pipeline" className="underline hover:text-zinc-300">
          open-source CLI
        </a>
        . <Link href="/new" className="underline hover:text-zinc-300">Back to options</Link>
      </p>
    </div>
  );
}
