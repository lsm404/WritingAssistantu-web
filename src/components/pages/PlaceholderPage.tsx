type Props = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="single-panel-wrap">
      <div className="ui-card single-panel-card placeholder-card">
        <div className="card-title">{title}</div>
        <div className="helper-text">{description}</div>
      </div>
    </div>
  );
}
