import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-stone-50">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: 'bg-stone-900 hover:bg-stone-800 text-sm normal-case',
            card: 'shadow-none border border-stone-200 rounded-2xl',
          }
        }}
      />
    </div>
  );
}
