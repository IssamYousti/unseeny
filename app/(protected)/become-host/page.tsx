import { applyForHost } from "./actions";

export default function Page() {
  return (
    <main className="max-w-2xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Host application</h1>

      <form action={applyForHost} className="space-y-4">

        <input name="full_name" placeholder="Full name" required className="input" />
        <input name="phone" placeholder="Phone number" required className="input" />
        <input name="country" placeholder="Country" required className="input" />

        <textarea
          name="property_description"
          placeholder="Describe your property"
          required
          className="textarea"
        />

        <textarea
          name="privacy_guarantee"
          placeholder="How do you guarantee full privacy?"
          required
          className="textarea"
        />

        <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl">
          Submit application
        </button>

      </form>
    </main>
  );
}
