interface PageHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export function PageHeader({ title, right }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-4 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-blue rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <h1 className="text-primary text-xl font-bold">{title}</h1>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
