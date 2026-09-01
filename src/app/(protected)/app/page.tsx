export default function ProtectedHomePage() {
  return (
    <section className="max-w-2xl space-y-3">
      <p className="font-secondary text-sm font-bold uppercase text-brand">
        Protected area
      </p>
      <h1 className="text-4xl font-bold sm:text-5xl">
        Your groups will live here.
      </h1>
      <p className="font-secondary text-base leading-7 text-muted-foreground">
        Authentication is active. Group functionality starts in the next product
        flow.
      </p>
    </section>
  );
}
