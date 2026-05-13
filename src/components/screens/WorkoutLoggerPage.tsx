import { useNavigate, useParams } from "react-router-dom";

export function WorkoutLoggerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center h-full text-center p-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      <p className="text-primary text-xl font-bold">Workout Logger</p>
      <p className="text-secondary text-sm mt-2">Coming soon</p>
      <p className="text-secondary text-xs mt-1 font-mono opacity-50">{id}</p>
      <button
        onClick={() => navigate(-1)}
        className="btn-primary mt-6 px-6"
      >
        ← Back
      </button>
    </div>
  );
}
