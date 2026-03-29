import { updateProfile } from "./actions";

type Props = {
  profile: {
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    dob?: string | null;
  };
};

export default function ProfileForm({ profile }: Props) {
  return (
    <form action={updateProfile} className="space-y-6">

      {/* USERNAME */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Username</label>
        <input
          name="username"
          defaultValue={profile.username || ""}
          required
          className="input"
        />
      </div>

      {/* NAME */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">First name</label>
          <input
            name="first_name"
            defaultValue={profile.first_name || ""}
            className="input"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Last name</label>
          <input
            name="last_name"
            defaultValue={profile.last_name || ""}
            className="input"
          />
        </div>
      </div>

      {/* DOB */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date of birth</label>
        <input
          type="date"
          name="dob"
          defaultValue={profile.dob || ""}
          className="input"
        />
      </div>

      {/* SUBMIT */}
      <div className="pt-4 border-t border-border">
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition"
        >
          Save changes
        </button>
      </div>

    </form>
  );
}
